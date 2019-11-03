<?php
namespace PPM;

if(!defined("_PPM_")) die();

class ParanoiaConfig {
	/*CLIENT AND SERVER VERSIONS MUST BE THE SAME*/
	public static $server_version = "1.3";

	//STEALTH MODE
	/*
	true = any bad/unauthorized request will return "404 - Not Found" instead of real error
	false = use it if you need to find out why things don't work
	*/
	public static $stealth_mode_on = true;


	//DATABASE - YOU MUST PUT YOUR CORRECT DATABASE SETTINGS HERE
	public static $mysql_server = 'localhost';
	public static $mysql_database = 'database_name';
	public static $mysql_username = 'user_name';
	public static $mysql_password = 'password';
	public static $mysql_table_user = 'user_table_name';
	public static $mysql_table_data = 'data_table_name';


	//SEED (THIS IS A STRING LIKE THAT WILL BE RENEWED AND SENT BACK TO PPM ON EACH COMUNICATION TO USE FOR CRYPTING FULL COMUNICATION DATA)
	/*
	seed_chars - array of 3 types of characters to use in seed
			- TYPE 1(ALPHA) don't think you can add anything
			- TYPE 2(NUMERIC) don't think you can add anything
			- TYPE 3(SPECIAL) feel free but watch out some chars don't work like: !!!DO NOT USE: "£","\"

	seed_min_num_chars_per_type - use at least this number of characters from each of the tree types
								- !!! (seed_min_num_chars_per_type * 3) should be less or equal seed_length_min !!!

	seed_length_min - the seed must be at least this long (number of characters)

	seed_length_max - the seed must be at most this long (number of characters)

	seed_life_time -	!IN SECONDS! - created seed will be registered in database so when next encrypted comunication comes in
						the last seed will be used to decrypt data.
						This seed will be valid for this number of seconds after which it will be deleted from db.
						!!!IMPORTANT!!! - Make sure in PPM server configuration in your browser for the parameter
						"Ping interval(ms)" you must put a value LESS than this so you can keep your seeds alive

	*/
	public static $seed_chars = array(
		1 => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
		2 => '0123456789',
		3 => '#@?!|&%^*+-=.:,;/([{< >}])'
	);
	public static $seed_min_num_chars_per_type = 8;
	public static $seed_length_min = 24;
	public static $seed_length_max = 32;
	public static $seed_life_time = 60;//seconds

	public static $padding_length_min = 32;
	public static $padding_length_max = 64;

	//if set to false PPM will NOT log messages to apache log
	public static $do_error_logging = false;

	//LOG TO FILE
	public static $log_to_file = true;
	public static $log_file = 'ppm.log';

}