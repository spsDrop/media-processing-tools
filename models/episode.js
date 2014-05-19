var xml2js = require('xml2js'),
    path = require("path"),
    parser = new xml2js.Parser(),
    netUtils = require("./../utils/net-utils"),
    mediaUtils = require("./../utils/media-utils").mediaUtils,
    config = require("./../config"),
    seriesRemap = config.seriesRemap,
    seariesSeasonRemap = config.seariesSeasonRemap,
    TVDBAPIKey = config.TVDBAPIKey;

exports.Episode = function(fullPath){
    var illegalCharacters = ['<','>','/','\\','|',':','*','?','"','/'],
        t = this;

    t.fileName =
    t.seriesName =
    t.episodeName =
    t.episodeNumber =
    t.seasonNumber =
    t.extension =
    t.path =
    t.seriesId =
    t.dir =
    t.airDate = null;

    t.clean = clean;
    t.remoteUpdateEpisodeData = remoteUpdateEpisodeData;
    t.getMediaInfo = getMediaInfo;
    t.getMediaScore = getMediaScore;

    init();

    function init(){
        t.path = fullPath;
        t.extension = path.extname(fullPath).match(/[^\.]*$/).toString().toLowerCase();
        t.fileName = fullPath.replace('.'+t.extension,'').match(new RegExp("[^\\"+path.sep+"]+$","i"))[0];
        if(t.fileName.match(/\d\d\d\d.\d\d.\d\d/)){
            t.seriesName = t.fileName.match(/(.*)\d\d\d\d.\d\d.\d\d/)[1];
            t.airDate = t.fileName.match(/\d\d\d\d.\d\d.\d\d/)[0].replace(/\./g,'-');
            t.episodeNumber = '';
            t.episodeName = '';
        }else if (t.fileName.match(/s\d*e\d/i)){
            t.seriesName = t.fileName.match(/(^.*)s\d+/i)[1];
            t.seasonNumber = t.fileName.match(/s(\d+)/i)[1];
            t.episodeNumber = t.fileName.match(/e(\d+)/i)[1];
            t.episodeName = t.fileName.match(/e\d+(.*)/i)[1];
        }else if (t.fileName.match(/\dx\d/i)){
            t.seriesName = t.fileName.match(/(.(?!\dx\d))+/)[0];
            t.seasonNumber = t.fileName.match(/(\d+)x/i)[1];
            t.episodeNumber = t.fileName.match(/x(\d+)/i)[1];
            t.episodeName = t.fileName.match(/x\d+(.*)/i)[1];
        }else if (t.fileName.match(/\d.\d/i)){
            if (t.fileName.match(/\d..\d/i))
            {
                t.seriesName = t.fileName.match(/(^.*)\d..\d/i)[1];
                t.seasonNumber = t.fileName.match(/(\d.).\d/i)[1];
                t.episodeNumber = t.fileName.match(/\d.(.\d)/i)[1];
                t.episodeName = t.fileName.match(/\d..\d(.*)/i)[1];
            }
            else
            {
                t.seriesName = t.fileName.match(/(^.*)\d.\d/i)[1];
                t.seasonNumber = "0"+t.fileName.match(/(\d).\d/i)[1];
                t.episodeNumber = t.fileName.match(/\d(.\d)/i)[1];
                t.episodeName = t.fileName.match(/\d.\d(.*)/i)[1];
            }
        }
        else
        {
            t.seriesName = "Probably a regular show, Pilot?  Special?";
            t.seasonNumber = 'XX';
            t.episodeNumber = 'XX';
            t.episodeName = t.fileName;
        }
        t.episodeNumber = parseFloat(t.episodeNumber);
        t.seasonNumber = parseFloat(t.seasonNumber);
        t.seriesName = clean(t.seriesName);
        
        if(seriesRemap[t.seriesName]){
            t.seriesName = seriesRemap[t.seriesName];
        }
        
        if(seariesSeasonRemap[t.seriesName]){
            t.seasonNumber += seariesSeasonRemap[t.seriesName];
        }
        
        t.episodeName = clean(t.episodeName);
    }

    function clean(str){
        illegalCharacters.forEach(function(illChar){
            str = str.replace(illChar,'');
        },t);
        str = str.replace(/-/g, "");
        str = str.replace(/\./g, " ");
        str = str.replace(/(^\s*)|(\s*$)/gi,"");
        str = str.replace(/_/g," ");
        str = str.replace(/\//g,",");
        return str;
    }

    function getMediaInfo(cb){
        mediaUtils.getMediaInfo(fullPath, function(tracks){
            t.tracks = tracks;
            cb();
        });
    }

    function getMediaScore(cb){
        var mediaScore = 0;

        getMediaInfo(function(){
            if(t.tracks.Audio && t.tracks.Video && t.tracks.General) {
                var width = parseFloat(t.tracks.Video[0].Width.replace(/\W/g, ""));

                t.bitRate = parseFloat(t.tracks.General[0].Overall_bit_rate.replace(/\W/g, "."));

                mediaScore += t.tracks.Audio[0].Language == "English" ? 10 : 0;
                mediaScore += t.tracks.Audio[0].Format == "DTS" ? 1 : 0;
                mediaScore += t.tracks.Audio.length == 1 ? 1 : 0;
                mediaScore += t.tracks.General[0].Format == "Matroska" ? 1 : 0;
                mediaScore += width >= 720 ? 1 : 0;
                mediaScore += width == 1980 ? 1 : 0;
                mediaScore += t.tracks.Video.length == 1 ? 1 : 0;
            }

            t.mediaScore = mediaScore;
            cb(mediaScore);
        })
    }

    function remoteUpdateEpisodeData(cb){
        validateSeries(t, function(err, episode){
            if(err){
                cb(err);
            }else{
                fetchEpisodeData(t, cb);
            }
        });
    }

    function validateSeries(episode, cb){
        var url =   "http://www.thetvdb.com/api/GetSeries.php?seriesname=" +
                    encodeURIComponent(episode.seriesName) +
                    "&language=en";
        console.log(url);
        netUtils.getURL(url, function(err, resText){
		    console.log(resText);
            parser.parseString(resText, function (err, data) {
                data = data.Data;
                var series = (data.Series && data.Series[0]) ? data.Series[0] : data.Series;
                if(series){
                    episode.seriesId = series.seriesid;
                    episode.seriesName = series.SeriesName;
                    console.log("Series name found: "+episode.seriesName);
                    cb(null, episode);
                }else{
                    var errText = "Series not found: " + episode.seriesName;
                    console.log( errText );
                    cb(new Error( errText ));
                }
            });
        });
    }

    function fetchEpisodeData(episode, cb){
        var airDateURL =    "http://www.thetvdb.com/api/GetEpisodeByAirDate.php?apikey=" +
                            TVDBAPIKey +
                            "&seriesid=" +
                            episode.seriesId +
                            "&airdate=" +
                            episode.airDate,

            regularURL =    "http://www.thetvdb.com/api/" +
                            TVDBAPIKey +
                            "/series/" +
                            episode.seriesId +
                            "/default/" +
                            episode.seasonNumber + "/" +
                            episode.episodeNumber,
            url = episode.airDate ? airDateURL : regularURL;

        console.log("Getting URL: "+url);
        netUtils.getURL( url, function(err, resText){
            parser.parseString(resText, function (err, data) {
                if(data && data.Data){
                    var episodeData = data.Data.Episode[0];
                    if(episodeData){
                        episode.episodeName = clean(episodeData.EpisodeName[0]);
                        episode.episodeNumber = episodeData.EpisodeNumber[0];
                        episode.seasonNumber = episodeData.SeasonNumber[0];
                        console.log("Episode name found: "+episode.episodeName);
                        cb(null, episode);
                    }else{
                        var errMsg = "Could not find episode: "+(episode.airDate ? episode.airDate : "s"+episode.seasonNumber+"e"+episode.episodeNumber);
                        console.log(errMsg);
                        cb(new Error(errMsg));
                    }
                }else{
                    var errMsg = "Could not find episode: "+(episode.airDate ? episode.airDate : "s"+episode.seasonNumber+"e"+episode.episodeNumber);
                    console.log(errMsg);
                    cb(new Error(errMsg));
                }
            });
        });
    }
};
