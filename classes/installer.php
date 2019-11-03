<?php
namespace PPM;
use PPM\ParanoiaPasswordManager as PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaUtils as PPMUTILS;

if(!defined("_PPM_")) die();

class ParanoiaInstaller {

    public function __construct() {
        PPMUTILS::addNoCacheHeaders();
        header("Content-type: text/html; charset=UTF-8");
    }

    public function execute() {
        $this->say("PPM INSTALLER");
        $this->doChecks();
	    $this->install();
    }


    /**
     * Trivial checks - from next version on we will need some table structure checks here
     *
     */
    private function doChecks() {
        $dbh = new \PDO('mysql:host='.PPMCONF::$mysql_server.';dbname='.PPMCONF::$mysql_database, PPMCONF::$mysql_username, PPMCONF::$mysql_password);
        $tables = json_encode($dbh->query('SHOW TABLES')->fetchAll());

        //TABLE USERS
        $tblName = PPMCONF::$mysql_table_user;
        if(strpos($tables, $tblName)!==false) {
            $this->say("Table(".$tblName.") is ok.");
	        //Check if there is at least one user registered in users
	        $users = $dbh->query('SELECT username FROM ' . PPMCONF::$mysql_table_user)->fetchAll();
	        if(count($users) > 0) {
		        $this->say("Users found: " . count($users));
	        } else {
		        $this->say("There are no users!", true);
		        $this->say("Connect to your db and add at least one user with an md5-hashed password.");
	        }
        } else {
            $this->say("Table(".$tblName.") does not exist!", true);
        }

        //TABLE DATA
        $tblName = PPMCONF::$mysql_table_data;
        if(strpos($tables, $tblName)!==false) {
            $this->say("Table(".$tblName.") is ok.");
        } else {
            $this->say("Table(".$tblName.") does not exist!", true);
        }

    }

    private function install() {
        $dbh = new \PDO('mysql:host='.PPMCONF::$mysql_server.';dbname='.PPMCONF::$mysql_database, PPMCONF::$mysql_username, PPMCONF::$mysql_password);

        //TABLE USERS
        $tblName = PPMCONF::$mysql_table_user;
        if(!count($dbh->query('SHOW TABLES LIKE \''.$tblName.'\'')->fetchAll())) {
            $dbh->query('CREATE TABLE '.$tblName.' (
                      username varchar(64) NOT NULL,
                      password varchar(64) NOT NULL,
                      PRIMARY KEY (username)
                    ) ENGINE=MyISAM DEFAULT CHARSET=utf8;');
            $this->say("Created table: " . $tblName);
        } else {
            $this->say("Table(".$tblName.") exists and will NOT be modified!");
        }

        //TABLE DATA
        $tblName = PPMCONF::$mysql_table_data;
        if(!count($dbh->query('SHOW TABLES LIKE \''.$tblName.'\'')->fetchAll())) {
            $dbh->query('CREATE TABLE '.$tblName.' (
                      id varchar(36) NOT NULL,
                      parent_id varchar(36) NOT NULL DEFAULT \'0\',
                      username varchar(64) NOT NULL DEFAULT \'\',
                      collection varchar(32) NOT NULL,
                      name varchar(64),
                      identifier varchar(255),
                      secure text,
                      params text,
                      PRIMARY KEY (id),
                      KEY `K_ppm_un` (`username`),
  					  KEY `K_ppm_cl` (`collection`)
                    ) ENGINE=MyISAM DEFAULT CHARSET=utf8;');
            $this->say("Created table: " . $tblName);
        } else {
            $this->say("Table(".$tblName.") exists and will NOT be modified!");
        }
        $dbh = null;
    }

    private function say($msg, $error=false, $lb=true) {
        echo ($error?'<span style="color:red;">':'') . $msg . ($error?'</span>':'') . ($lb?"<br />\n":"");
    }
}