var fs = require("fs"),
    fileUtils = require("./utils/file-utils").fileUtils,
    Episode = require("./models/episode").Episode,
    config = require("./config.js");

exports.dedupePath = dedupePath;
exports.createEpisodesMap = createEpisodesMap;
exports.scoreAndSortEpisodeSet = scoreAndSortEpisodeSet;
exports.deleteDupesAndRenameKeeper = deleteDupesAndRenameKeeper;

function dedupePath(path) {
    fileUtils.findFileByExtensions(path, config.Extensions, function(paths){
        var episodesMap = createEpisodesMap(paths);

        for( var episodeKey in episodesMap){
            if(!episodesMap.hasOwnProperty(episodeKey)){
                continue
            }
            var episodeSet = episodesMap[episodeKey];

            if(episodeSet.length > 1){
                scoreAndSortEpisodeSet(episodeSet, function(episodeSet){
                    deleteDupesAndRenameKeeper(episodeSet);
                });
            }
        }
    });
}

function createEpisodesMap(matchingPaths){
    var episodeMap = {};

    matchingPaths.forEach(function(episodePath){
        var episode = new Episode(episodePath.file),
            episodeKey;

        if(episode.seriesName && episode.seasonNumber && episode.episodeNumber){
            episodeKey = episode.seriesName + "s"+episode.seasonNumber + "e"+episode.episodeNumber;
            if(episodeMap[episodeKey]){
                episodeMap[episodeKey].push(episode);
            }else{
                episodeMap[episodeKey] = [episode]
            }
        }
    });

    return episodeMap;
}

function scoreAndSortEpisodeSet(episodeSet, cb){
    var count = 0;
    episodeSet.forEach(function(episode){
        count++;
        episode.getMediaScore(function(){
            checkDone();
        });
    });

    function checkDone(){
        count--;
        if(count == 0){
            episodeSet = episodeSet.sort(function(a,b){
                if(a.mediaScore == b.mediaScore){
                    if(a.bitRate == b.bitRate){
                        return 0
                    }else{
                        return a.bitRate < b.bitRate ? 1 : -1;
                    }
                }else{
                    return a.mediaScore < b.mediaScore ? 1: -1;
                }
            });
            cb(episodeSet);
        }
    }
}

function deleteDupesAndRenameKeeper(episodes){
    episodes.forEach(function(episode, i){
        if(i>0){
            console.log("Deleting: "+episode.fileName);
            console.log("mediaScore: "+episode.mediaScore+" bitRate: "+episode.bitRate);
            fs.unlinkSync(episode.path);
        }
    });

    console.log("Keeping: "+episodes[0].fileName);
    console.log("mediaScore: "+episodes[0].mediaScore+" bitRate: "+episodes[0].bitRate);
    fs.renameSync(episodes[0].path, episodes[0].path.replace(/\.\d+\.\w{3,4}$/,"")+"."+episodes[0].extension);

    console.log("\n");
}