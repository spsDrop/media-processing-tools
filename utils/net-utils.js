var http = require('http');

exports.getURL = function(url, cb){
    var options;

    try{
        options = {
            host: url.match(/\/\/([^\/]+)/)[1],
            path: url.match(/\/\/[^\/]+(.+)/)[1],
            port: 80
        };
    }catch(err){
        cb(err)
    }

    http.get(options, function(res){
        var data = "";

        res.on("data", function(chunk){
            data += chunk.toString();
        });

        res.on("end", function(){
            cb(null, data);
        });

        res.on("close", function(err){
            cb(err);
        })
    }).on("error", function(err){
        cb(err);
    })
};