var xml2js = require('xml2js'),
    parser = new xml2js.Parser(),
    netUtils = require("./../utils/net-utils"),
    config = require("./../config"),
    THE_MOVE_DB_API_KEY = config.THE_MOVE_DB_API_KEY;

exports.Movie = function(fullPath){
    var illegalCharacters = ['<','>','/','\\','|',':','*','?','"','/'],
        t = this;
    
    t.file =
    t.fileName =
    t.year =
    t.title = null;
    t.clean = clean;
    t.remoteUpdateMovieData = remoteUpdateMovieData;
    
    init();
    
    function init(){
        t.path = fullPath;
        t.extension = fullPath.match(/^.*\.(.*)$/)[1];
        t.fileName = fullPath.replace('.'+t.extension,'').match(/[^\/]+$/i)[0];
        t.year = t.fileName.replace('1080','').replace('720','').match(/\d\d\d\d/)[0];
        t.title = t.fileName.replace('1080','').replace('720','').match(/^(.*)\d\d\d\d/)[1].replace("(","").replace(")","").split('.').join(' ');
        t.title = clean(t.title);
    }
    
    function clean(str){
        illegalCharacters.forEach(function(illChar){
            str = str.replace(illChar,'');
        });
        return str;
    }

    function remoteUpdateMovieData(movie, cb){
        var url =   "http://api.themoviedb.org/2.1/Movie.search/en/json/" +
            THE_MOVE_DB_API_KEY + "/" +
            encodeURIComponent(movie.title);

        netUtils.getURL(url, function(err, resText){
            if(err){
                console.log("Could not read themoviedb.com");
            }else{
                var responseJSON = JSON.parse(resText),
                    movieEntry = responseJSON[0];

                if(movieEntry){
                    movie.year = movieEntry.released.match(/\d\d\d\d/)[0];
                    movie.title = movie.clean(movieEntry.name);

                    console.log("Movie Found: "+movie.title+" ("+movie.year+")");
                    cb(null, movie);
                }else{
                    console.log("Movie not found:" + movie.title);
                    cb(new Error("Movie not found:" + movie.title));
                }
            }
        });
    }
};
