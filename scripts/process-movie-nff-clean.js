#!/usr/bin/env node

var fileUtils = require("./../utils/file-utils").fileUtils,
    movieProcessor = require("./../media-processor"),
    config = require("./../config.js");

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
        movieProcessor.processPath(path, config.mediaTypes.MOVIE, true, true);
    }
});
