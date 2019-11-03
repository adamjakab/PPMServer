<?php
namespace PPM;
use PPM\ParanoiaPasswordManager as PPM;
use PPM\ParanoiaConfig as PPMCONF;
use PPM\ParanoiaInstaller;

if(!defined("_PPM_")) die();

class ParanoiaUtils {
    private static $specialExecution = false;
    private static $headers = array(
        '400' => '400 Bad Request',
        '403' => '403 Forbidden',
        '404' => '404 Not Found',
        '503' => '503 Service Unavailable'
    );

    public static function reportErrorAndExit($message, $code = 400) {
        if (PPMCONF::$stealth_mode_on) {
            header('HTTP/1.1 ' . self::$headers{404},true,404);
	        header("Content-type: text/html; charset=UTF-8");
            exit('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL '.$_SERVER['SCRIPT_NAME'].' was not found on this server.</p><hr><address>'.$_SERVER['SERVER_SIGNATURE'].'</address></body></html>');
        }
        //WE HAVE STEALTH MODE OFF SO WE CAN OUTPUT MESSAGES
        $code = (isset($headers{$code})?$code:400);
        header('HTTP/1.1 ' . self::$headers{$code},true,$code);
        exit($message);
    }

    public static function leftRightTrimString($str="", $lft=0, $rgt=0) {
        return(substr($str, $lft, strlen($str)-$lft-$rgt));
    }

	public static function leftRightPadString($str="", $lft=0, $rgt=0) {
		$ugly = self::getUglyString(($lft>$rgt?$lft:$rgt)*2, ($lft>$rgt?$lft:$rgt)*3);
		$leftChars = substr(self::encrypt_AesCtr($ugly, $ugly),rand(1, $lft), $lft);
		$rightChars = substr(self::encrypt_AesCtr($ugly, $ugly),rand(1, $rgt), $rgt);
		return($leftChars.$str.$rightChars);
	}


    /**
     * get variable length ugly string
     * @param $minLength
     * @param $maxLength
     * @return string
     */
    public static function getUglyString($minLength, $maxLength) {
        $str = "";
        $str_length = rand($minLength, $maxLength);
        //randomly select how many chars from each type we will use
        $type_len[1] = rand(PPMCONF::$seed_min_num_chars_per_type, $str_length-(2*PPMCONF::$seed_min_num_chars_per_type));//type=1[ALPHA]
        $type_len[2] = rand(PPMCONF::$seed_min_num_chars_per_type,$str_length-$type_len[1]-PPMCONF::$seed_min_num_chars_per_type);//type=2[NUMERIC]
        $type_len[3] = $str_length - $type_len[1] - $type_len[2];//type=3[SPECIAL]
        //
        while(strlen($str) < $str_length) {
            $t = rand(1,3);
            $found = false;
	        $chars = "";
            if ($type_len[$t]>0) {
                $type_len[$t]--;
                $chars = PPMCONF::$seed_chars[$t];
                $found = true;
            }
            if ($found) {
                $str .= substr($chars,rand(0,strlen($chars)-1),1);
            }
        }
        return($str);
    }

	public static function getUUIDv4() {
		return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',

			// 32 bits for "time_low"
			mt_rand(0, 0xffff), mt_rand(0, 0xffff),

			// 16 bits for "time_mid"
			mt_rand(0, 0xffff),

			// 16 bits for "time_hi_and_version",
			// four most significant bits holds version number 4
			mt_rand(0, 0x0fff) | 0x4000,

			// 16 bits, 8 bits for "clk_seq_hi_res",
			// 8 bits for "clk_seq_low",
			// two most significant bits holds zero and one for variant DCE1.1
			mt_rand(0, 0x3fff) | 0x8000,

			// 48 bits for "node"
			mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
		);
	}


	public static function JSON_DECODE($str) {
		$answer = null;
		try {
			$answer = json_decode($str);
		} catch (\Exception $e) {
			throw new \Exception("JSON DECODE ERROR: " . json_last_error(), 400);
		}
		if ($answer === null) {
			throw new \Exception("JSON DECODE ERROR: UNPARSABLE INPUT!", 400);
		}
		return($answer);
	}

	public static function JSON_ENCODE($str) {
		$answer = null;
		try {
			$answer = json_encode($str);
		} catch (\Exception $e) {
			throw new \Exception("JSON ENCODE ERROR: " . json_last_error(), 400);
		}
		if ($answer === null) {
			throw new \Exception("JSON ENCODE ERROR: NULL OUTPUT!", 400);
		}
		return($answer);
	}

	public static function fix_utf8_encoding($string)	{
		if(mb_detect_encoding($string." ", 'UTF-8') == 'UTF-8') {
			return $string;
		} else {
			return utf8_encode($string);
		}
	}

    public static function decrypt_AesCtr($txt,$key) {
        return(\AesCtr::decrypt($txt,$key,256));
    }

    public static function encrypt_AesCtr($txt,$key) {
        return(\AesCtr::encrypt($txt,$key,256));
    }


    public static function initParanoiaSession() {
        if (!session_id()) {
            session_start();
	        if (!session_id()) {
                throw new \Exception("Server sessions are disabled or not supported!", 503);
            }
        }
        PPM::log("SID: " . session_id());
    }

	public static function shutdownParanoiaSession() {
		session_destroy();
		setcookie('PHPSESSID','');
	}

	public static function setSessionVar($key=null, $val=null) {
		$answer = false;
		if (session_id() && !empty($key)) {
			$_SESSION[$key] = $val;
			$answer = $val;
		}
		return($answer);
	}

	public static function getSessionVar($key){
		$answer = false;
		if (session_id() && isset($_SESSION[$key])) {
			$answer = $_SESSION[$key];
		}
		return($answer);
	}



    public static function addNoCacheHeaders() {
        header("Expires: Sat, 1 Jan 2000 05:00:00 GMT");
        header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
        header("Cache-Control: no-store, no-cache, must-revalidate");
        header("Cache-Control: post-check=0, pre-check=0", false);
        header("Pragma: no-cache");
        header("Content-type: text/plain; charset=UTF-8");
    }



}