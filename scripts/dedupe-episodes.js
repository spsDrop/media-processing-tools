#!/usr/bin/env node

var fs = require("fs"),
    Path = require("path"),
    fileUtils = require("./../utils/file-utils").fileUtils,
    dedupePath = require("../dedupe-series").dedupePath;

process.chdir(Path.join(__dirname, ".."));

if(!process.argv[2]){
    console.log("Please Enter a File Path.");
    process.exit();
}

var path = process.argv[2].replace(/\/$/,'');

console.log("Processing path: "+path);

fileUtils.validateFilePath(path, function(err){
    if(err){
        console.log(err);
    }else{
        dedupePath(path);
    }
});
