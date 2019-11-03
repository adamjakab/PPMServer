<?php
namespace PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaUtils as PPMUTILS;
use PPM\ParanoiaStorage;
use PPM\ppmRequest;
use PPM\ppmResponse;

/**
 * Created by Adam Jakab.
 * Date: 2/26/13
 * Time: 10:51 AM
 */
class ParanoiaPasswordManager {
	/**
	 * @var $ppmStorage ParanoiaStorage
	 */
	private static $ppmStorage;
	/**
	 * @var $ppmRequest ppmRequest
	 */
	private static  $ppmRequest;
	/**
	 * @var $ppmResponse ppmResponse
	 */
	private static  $ppmResponse;

	public function __construct() {
		//Redirect to the installer script if found
		if(file_exists('install.php')) {
			header('Location: install.php');
			exit();
		}
		//
		require_once('config.php');
        require_once('classes/utils.php');//general utilities
        require_once('classes/storage.php');//database storage functions
		require_once('classes/ppmRequest.php');//the request interpreter class
		require_once('classes/ppmResponse.php');//the response creator class
        require_once('aes/aes.php');//AES PHP implementation
        require_once('aes/aesctr.php');//AES Counter Mode implementation

		//
		ini_set('display_errors',1);
		if (PPMCONF::$stealth_mode_on) {
			ini_set('display_errors',0);
		}
        try {
            PPMUTILS::addNoCacheHeaders();
            $this->work();
        } catch (\Exception $e) {
            $this->log("Exception: " . $e->getMessage());
	        PPMUTILS::reportErrorAndExit("FATAL PPM ERROR: " . $e->getMessage() , $e->getCode());
        }
	}

	private function work() {
		$this->log("Initing");
        PPMUTILS::initParanoiaSession();
		self::$ppmStorage = new ParanoiaStorage();
		self::$ppmRequest = new ppmRequest();
		self::$ppmResponse = new ppmResponse();
		//
		self::$ppmRequest->elaborateRequest();
		//
		$this->log(self::$ppmResponse->getNonEncryptedResponse());
		//
		echo(self::$ppmResponse->getEncryptedResponse());
	}

	public static function getStorage() {
		return(self::$ppmStorage);
	}

	public static function getRequest() {
		return(self::$ppmRequest);
	}

	public static function getResponse() {
		return(self::$ppmResponse);
	}

	public static function log($msg="", $level=0) {
		if(PPMCONF::$log_to_file) {
			$msg = date("r") . ": " . $msg . "\n";
			$msgtype = 3;
			$msgdest = PPMCONF::$log_file;
		} else {
			$msg = "PPM: " . $msg;
			$msgtype = 0;
			$msgdest = "";
		}

		if(PPMCONF::$do_error_logging === true)
		{
            error_log($msg, $msgtype, $msgdest);
        }

        //echo $msg . "\n";
	}
}

ini_set('display_errors',1);//OUTPUT ALL ERRORS AT LEAST UNTIL WE DON'T GET CONFIG AND SUPPRESS IT WITH STEALTH MODE
error_reporting(E_ALL);
define("_PPM_","");
new ParanoiaPasswordManager();
