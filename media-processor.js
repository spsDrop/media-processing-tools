var Episode = require("./models/episode").Episode,
    Movie = require("./models/movie").Movie,
    fileUtils = require("./utils/file-utils").fileUtils,
    xbmcAPI = require("./xbmc-api"),
    config = require("./config"),

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
                        fileUtils.moveFile(currentPath, targetFile, existanceCheck);
                    });
                }
            }



            function existanceCheck(err, targetPath, exists){
                if(err){
                    console.log("Error moving file.");
                    processNext();
                }else{				
					if(exists){
						fileUtils.getSafeFileName(targetPath, function(targetPath){
							console.log(currentPath);
							fileUtils.moveFile(currentPath, targetPath, processNext);
						})
					}else{
						processNext();
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
            targetMovieFile = targetMovieFolder + "/" + movie.title + " (" + movie.year + ")" + "." + movie.extension;

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
            targetEpisodeFile = targetFolder + episode.seriesName + "/" + episode.seriesName + " - s" + zerofy(episode.seasonNumber) + "e" + zerofy(episode.episodeNumber) + " - " + episode.episodeName + "." + episode.extension;

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
