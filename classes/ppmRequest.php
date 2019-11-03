<?php
namespace PPM;
use PPM\ParanoiaPasswordManager as PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaUtils as PPMUTILS;

if(!defined("_PPM_")) die();

class ppmRequest{
	private $REQUEST;
	private $RAWPOST;

	public function __construct() {
		//$this->_REQUEST_IP = $_SERVER['REMOTE_ADDR'];
		$this->REQUEST = null;
		$this->get_raw_post_data();
		PPM::log("request-length: " . strlen($this->RAWPOST));
		//
		if (!$this->decryptRawPost_SEED()) {
			$this->decryptRawPost_USER();
		}
		if(!$this->REQUEST) {
			throw new \Exception("BAD REQUEST! ", 400);
		} else {
			PPM::log("REQUEST: " . PPMUTILS::JSON_ENCODE($this->REQUEST));
		}
	}

	public function getRequestKey($key=null) {
		$answer = false;
		if(isset($this->REQUEST->$key)) {
			$answer = $this->REQUEST->$key;
		}
		return($answer);
	}

	public function elaborateRequest() {
		$service = $this->REQUEST->service;
		$storage = PPM::getStorage();
		$response = PPM::getResponse();
		//verify if user credentials in request are valid
		if ($service != "get_seed") {
			$storage->verifyUser();
		}

		switch ($service) {
			case "get_seed":
				$response->setKey("response", "New seed assigned.");
				break;
			case "db":
				$res = $storage->executeDbOperation($this->REQUEST->dbdata);
				$response->setKey("response", "DB operation completed.");
				$response->setKey("result", ($res->result?"SUCCESS":"ERROR"));
				if (isset($res->newid)) {$response->setKey("newID", $res->newid);}//for new records
				if (isset($res->indexData)) {$response->setKey("indexData", $res->indexData);}//for data Index
                if (isset($res->data)) {$response->setKey("data", $res->data);}//for data secure/params
				break;
			case "ping":
				$response->setKey("response", "Pinged.");
				break;
			case "logout":
				PPMUTILS::shutdownParanoiaSession();
				$response->setKey("response", "Session destroyed.");
				break;
			default:
				throw new \Exception("Unknown service requested: " . $service, 400);
		}
	}


	/**
	 * This method is the last-chance decryption method - (mostly you are requesting a new seed)
	 * if you are calling here means that RAWPOST cannot be decrypted by any existing/available seeds
	 * it also means we don't know anything about who is sending this so we must loop through ALL
	 * user/pwd pairs in user table and try to decrypt RAWPOST with those
	 * Also, for trimming (both left and right) we will use the length of the username (since pwd-md5 is always the same length)
	 */
	private function decryptRawPost_USER() {
		$answer = false;
		$storage = PPM::getStorage();
		$users = $storage->getAllUsers();
		if (count($users)) {
			foreach($users as &$user) {
				try {
					//PPM::log("testing user: " . $user["username"]);
					$trimmedString = PPMUTILS::leftRightTrimString($this->RAWPOST, strlen($user["username"]), strlen($user["username"]));
					$reqString = PPMUTILS::fix_utf8_encoding(PPMUTILS::decrypt_AesCtr(PPMUTILS::decrypt_AesCtr($trimmedString, $user["password"]), $user["username"]));
					//PPM::log("json: " . $reqString);
					//the following line will thow an exception if $reqString is not a JSON string
					$this->REQUEST = PPMUTILS::JSON_DECODE($reqString);
					//if we are still here then this was successfull so we add the correct
					$answer = true;
					//we will need this to identify data in db
					PPMUTILS::setSessionVar('username', $user["username"]);
					break;
				} catch (\Exception $e) {
					//this didn't work out - let's try the next one
				}
			}
		}
		return($answer);
	}


	private function decryptRawPost_SEED() {
		$answer = false;
		try {
			$trimmedString = PPMUTILS::leftRightTrimString($this->RAWPOST, PPMUTILS::getSessionVar("leftPadLength"), PPMUTILS::getSessionVar("rightPadLength"));
			$reqString = PPMUTILS::fix_utf8_encoding(PPMUTILS::decrypt_AesCtr($trimmedString, PPMUTILS::getSessionVar("seed")));
			//the following line will thow an exception if $reqString is not a JSON string
			$this->REQUEST = PPMUTILS::JSON_DECODE($reqString);
			//if we are still here then this was successfull so we add the correct
			$answer = true;
		} catch (\Exception $e) {
			PPM::log("Hmm");
			//this didn't work out - life is tough
		}
		return($answer);
	}

	private function get_raw_post_data() {
		try {
			$putdata = fopen("php://input", "r");
			$this->RAWPOST = '';
			while ($data = fread($putdata,2048)) {
				$this->RAWPOST .= $data;
			}
			//$this->RAWPOST = "OgJHhmePRFHHcEpeRCf9wumSRgyTPv/O35gtEnqeieCY3mvLItjxU6yW3RwyXkow";//{"service":"get_seed"}
		} catch (Exception $e) {
			throw new Exception("GET RAW DATA FAILED! " . $e->getMessage(), 400);
		}
	}

}

/*
 * sendDataRaw":{
	 * "service":"db",
	 * "dbdata":{
 *          "operation":"save",
 *          "id":false,
 *          "parent_id":false,
 *          "collection":"passcard",
 *          "identifier":"b",
 *          "payload":"{\"name\":\"a\",\"username\":\"c\",\"password\":\"d\"}"
 *     },
	 * "seed":"0k5.C8^v4B;*79m7xF.v/iNZgrHM",
	 * "leftPadLength":47,
	 * "rightPadLength":55
 * }
 * */