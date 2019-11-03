<?php
namespace PPM;
use PPM\ParanoiaPasswordManager as PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaUtils as PPMUTILS;

if(!defined("_PPM_")) die();

class ppmResponse{
	private $RESPONSE;

	public function __construct() {
		$this->RESPONSE = new \stdClass();
		$this->setKey("timestamp", date("U"), true);
		$this->setKey("seed", PPMUTILS::getUglyString(PPMCONF::$seed_length_min,PPMCONF::$seed_length_max), true);
		$this->setKey("leftPadLength", rand(PPMCONF::$padding_length_min, PPMCONF::$padding_length_max), true);
		$this->setKey("rightPadLength", rand(PPMCONF::$padding_length_min, PPMCONF::$padding_length_max), true);
	}


	public function setKey($key=null, $val=null, $saveToSession=false) {
		if($key) {
			$this->RESPONSE->$key = $val;
			if($saveToSession) {
				PPMUTILS::setSessionVar($key, $val);
			}
		}
	}

	public function getNonEncryptedResponse() {
		return(PPMUTILS::JSON_ENCODE($this->RESPONSE));
	}

	public function getEncryptedResponse() {
		$request = PPM::getRequest();
		$respStr = PPMUTILS::JSON_ENCODE($this->RESPONSE);
		$answer = PPMUTILS::encrypt_AesCtr($respStr, "" . $request->getRequestKey("seed"));
		$answer = PPMUTILS::leftRightPadString($answer, $request->getRequestKey("leftPadLength"), $request->getRequestKey("rightPadLength"));
		return($answer);
	}
}