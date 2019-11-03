<?php
namespace PPM;
use PPM\ParanoiaPasswordManager as PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaUtils as PPMUTILS;

if(!defined("_PPM_")) die();


class ParanoiaStorage {
	private $_db;
	private $_TIMESTAMP;


	public function __construct() {
		$this->_TIMESTAMP = date("U");
		//
		try {
			$this->_db = new \PDO('mysql:host='.PPMCONF::$mysql_server.';dbname='.PPMCONF::$mysql_database, PPMCONF::$mysql_username, PPMCONF::$mysql_password);
		} catch (\Exception $e) {
			throw new \Exception("Server connection unavailable: " . $e->getMessage(), 503);
		}
	}


	public function verifyUser() {
		//
	}

	public function getAllUsers() {
		return($this->_db->query('SELECT username, password FROM ' . PPMCONF::$mysql_table_user)->fetchAll());
	}


	/*
	 * "dbdata":{
 *          "operation":"save",
 *          "id":false,
 *          "parent_id":false,
 *          "collection":"passcard",
 *          "identifier":"b",
 *          "payload":"{\"name\":\"a\",\"username\":\"c\",\"password\":\"d\"}"
 *     },
	 * */
	public function executeDbOperation($dbData) {
		$answer = new \stdClass();
		$answer->result = false;
		$username = PPMUTILS::getSessionVar("username");

		//-------------------------------------------------------------------------------------SAVE
		if ($dbData->operation == "save") {
			if(!isset($dbData->params)) {$dbData->params = new \stdClass();}
            if($dbData->params) {$dbData->params->mdate = date("U");}
			if (!$dbData->id) {//INSERT
                if($dbData->params) {$dbData->params->cdate = date("U");}
				$answer->newid = PPMUTILS::getUUIDv4();//!TODO/IMPORTANT: this could give UUID already present in db - needs transparent check and UNIQUE UUID!!!
				$q = 'INSERT INTO '.PPMCONF::$mysql_table_data
					.' (id, parent_id, username, collection, name, identifier, secure, params) VALUES ('
					. $this->_db->quote($answer->newid) . ', '
					. $this->_db->quote(($dbData->parent_id?$dbData->parent_id:0)) . ', '
					. $this->_db->quote($username) . ', '
					. $this->_db->quote($dbData->collection) . ', '
					. $this->_db->quote($dbData->name) . ', '
					. $this->_db->quote($dbData->identifier) . ', '
					. $this->_db->quote($dbData->secure) . ', '
                    . $this->_db->quote(json_encode($dbData->params)) . ''
					.')';
			} else {//UPDATE
				$where[] = 'username = ' . $this->_db->quote($username);
				$where[] = 'id = ' . $this->_db->quote($dbData->id);
				$where = ' WHERE ' . implode( ' AND ', $where );
				$q = 'UPDATE '.PPMCONF::$mysql_table_data . ' SET'
					. ' parent_id = ' . $this->_db->quote(($dbData->parent_id?$dbData->parent_id:0))
					. ', name = ' . $this->_db->quote($dbData->name)
					. ', identifier = ' . $this->_db->quote($dbData->identifier)
					. ', secure = ' . $this->_db->quote($dbData->secure)
					. ', params = ' . $this->_db->quote(json_encode($dbData->params))
					. '' . $where
					.'';
			}
		}
		//-------------------------------------------------------------------------------------DELETE
		if ($dbData->operation == "delete") {
			$where[] = 'username = ' . $this->_db->quote($username);
			$where[] = 'id = ' . $this->_db->quote($dbData->id);
			$where = ' WHERE ' . implode( ' AND ', $where );
			$q = 'DELETE FROM '.PPMCONF::$mysql_table_data . $where;
		}
		//-------------------------------------------------------------------------------------GET INDEX
		if ($dbData->operation == "get_index") {
			$where[] = 'res.username = ' . $this->_db->quote($username);
			if (isset($dbData->collection)&&!empty($dbData->collection)) {
				$where[] = "res.collection = " . $this->_db->quote($dbData->collection);
			}
			$where = ' WHERE ' . implode( ' AND ', $where );
			$q = 'SELECT id, parent_id, collection, name, identifier FROM '.PPMCONF::$mysql_table_data.' AS res ' . $where;
			$sm = $this->_db->query($q);
			$answer->indexData = $sm->fetchAll(\PDO::FETCH_ASSOC);
			$answer->result = true;
			unset($q);
		}
		//-------------------------------------------------------------------------------------GET ITEM PARAMS
		if ($dbData->operation == "get_params") {
            $where[] = 'res.username = ' . $this->_db->quote($username);
            $where[] = 'res.id = ' . $this->_db->quote($dbData->id);
            $where = ' WHERE ' . implode( ' AND ', $where );
            $q = 'SELECT params FROM '.PPMCONF::$mysql_table_data.' AS res ' . $where;
            $sm = $this->_db->query($q);
            $answer->data = $sm->fetchColumn();
            $answer->result = true;
            unset($q);
		}
		//-------------------------------------------------------------------------------------GET ITEM SECURE
        if ($dbData->operation == "get_secure") {
	        $where[] = 'res.username = ' . $this->_db->quote($username);
	        $where[] = 'res.id = ' . $this->_db->quote($dbData->id);
	        $where = ' WHERE ' . implode( ' AND ', $where );
	        $q = 'SELECT secure FROM '.PPMCONF::$mysql_table_data.' AS res ' . $where;
	        $sm = $this->_db->query($q);
	        $answer->data = $sm->fetchColumn();
	        $answer->result = true;
	        unset($q);
        }


		if(isset($q)) {
			$answer->result = ($this->_db->exec($q) == 1);
		}
		return($answer);
	}
}