var xml2js = require('xml2js'),
    parser = new xml2js.Parser(),
    netUtils = require("./../utils/net-utils"),
    config = require("./../config"),
    seriesRemap = config.seriesRemap,
    TVDBAPIKey = config.TVDBAPIKey;

exports.Episode = function(fullPath){
    var illegalCharacters = ['<','>','/','\\','|',':','*','?','"'],
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

    init();

    function init(){
        t.path = fullPath;
        t.extension = fullPath.match(/^.*\.(.*)$/)[1];
        t.fileName = fullPath.replace('.'+t.extension,'').match(/[^\/]+$/i)[0];
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
        t.episodeName = clean(t.episodeName);
    }

    function clean(str){
        illegalCharacters.forEach(function(illChar){
            str = str.replace(illChar,'');
            str = str.replace(/-/g, "");
            str = str.replace(/\./g, " ");
            str = str.replace(/(^\s*)|(\s*$)/gi,"");
            str = str.replace(/_/g," ");
            str = str.replace(/\//g,",");
        },t);
        return str;
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

        netUtils.getURL(url, function(err, resText){
            parser.parseString(resText, function (err, data) {
                var series = (data.Series && data.Series[0]) ? data.Series[0] : data.Series;
                if(data.Series){
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
                if(data){
                    if(data.Episode){
                        episode.episodeName = data.Episode.EpisodeName;
                        episode.episodeNumber = data.Episode.EpisodeNumber;
                        episode.seasonNumber = data.Episode.SeasonNumber;
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