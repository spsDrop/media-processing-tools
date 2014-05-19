var Episode = require("./models/episode").Episode,
    Movie = require("./models/movie").Movie,
    fileUtils = require("./utils/file-utils").fileUtils,
    dedupePath = require("./dedupe-series").dedupePath,
    xbmcAPI = require("./xbmc-api"),
    config = require("./config"),
	path = require("path"),

    mediaTypes = config.mediaTypes,
    Extensions = config.Extensions,
    processors = {
        EPISODE:processEpisode,
        MOVIE:processMovie
    };

exports.processPath = processPath;

function processPath(path, mediaType, getNameFromFolders, cleanDirectory, cb){
    cb = cb || function(){};

    fileUtils.findFileByExtensions(path, Extensions, function(matchingPaths){

        if(!matchingPaths.length){
            console.log("No suitable file found.");
        }else{
            processNext();
        }

        function processNext(){
            var matchingPath,
                currentPath;

            
            if(matchingPaths.length){
                matchingPath = matchingPaths.shift();

                console.log("Processing File: "+matchingPath.file);

                if(getNameFromFolders){
                    fileUtils.folderNameToFileName(path, matchingPath.file, matchingPath.extn, function(cleanName){
                        currentPath = cleanName;
                        processors[mediaType](cleanName, moveFiles);
                    });
                }else{
                    currentPath = matchingPath.file;
                    processors[mediaType](matchingPath.file, moveFiles);
                }
            }else{
				if(cleanDirectory){
					console.log("Removing download directory.");
					fileUtils.rmdirRecursive(path);
				}
                xbmcAPI.updateAllXBMCServers();
				console.log("Your directory has been processed.");
                cb();
            }



            function moveFiles(err, targetFolder, targetFile){
                if(err){
                    processNext();
                }else{
                    fileUtils.createDirectories(targetFolder, function(){
                        fileUtils.moveFile(currentPath, targetFile, function(err, targetPath, exists){
                            existenceCheck(err, targetPath, exists, function(){
                                if(exists){
                                    dedupePath(targetFolder);
                                }
                                processNext();
                            });
                        });
                    });
                }
            }



            function existenceCheck(err, targetPath, exists, cb){
                if(err){
                    console.log("Error moving file.");
                    cb();
                }else{
					if(exists){
						fileUtils.getSafeFileName(targetPath, function(targetPath){
							fileUtils.moveFile(currentPath, targetPath, cb);
						})
					}else{
						cb()
					}
                }
            }


        }
    });
}

function processMovie(finalName, cb){
    var movie = new Movie(finalName),
        targetFolder = config.targetFolders[mediaTypes.MOVIE];

    movie.remoteUpdateMovieData(movie, function(err){
        var targetMovieFolder = targetFolder + movie.title + " (" + movie.year + ")",
            targetMovieFile = targetMovieFolder + path.sep + movie.title + " (" + movie.year + ")" + "." + movie.extension;

        if(err){
            cb(err);
        }else{
            cb(null, targetMovieFolder, targetMovieFile);
        }
    });
}

function processEpisode(finalName, cb){
    var episode = new Episode(finalName),
        targetFolder = config.targetFolders[mediaTypes.EPISODE];

    episode.remoteUpdateEpisodeData(function(err){
        var targetEpisodeFolder = targetFolder + episode.seriesName,
            targetEpisodeFile = targetFolder + episode.seriesName + path.sep + episode.seriesName + " - s" + zerofy(episode.seasonNumber) + "e" + zerofy(episode.episodeNumber) + " - " + episode.episodeName + "." + episode.extension;

        if(err){
            cb(err);
        }else{
            cb(null, targetEpisodeFolder, targetEpisodeFile);
        }
    });

    function zerofy(num) {
        if (num < 10) {
            return '0' + num;
        } else {
            return num;
        }
    }
}
