#!/usr/bin/env node

var fs = require("fs"),
    fileUtils = require("./../utils/file-utils").fileUtils,
    episodeProcessor = require("./../media-processor"),
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
        episodeProcessor.processPath(path, config.mediaTypes.EPISODE, true, true);
    }
});