var parseString = require('xml2js').parseString,
    cp = require("child_process");

exports.mediaUtils = {
    getMediaInfo:getMediaInfo
};

function getMediaInfo(filePath, cb) {
    var handbrake = cp.spawn("utils/mediainfo", [filePath, '--Output=XML']),
        data = "";

    handbrake.stdout.on("data", update);
    handbrake.on("exit", onComplete);

    function update(d) {
        data += d;
    }

    function onComplete() {
        parseString(data, {mergeAttrs: true, explicitArray: false}, function (err, result) {
            if(err){
                console.log(err);
                cb({});
            }else{
                var tracks = {};
                result.Mediainfo.File.track.forEach(function (track) {
                    for (var key in track) {
                        if (track[key].match(/^[\d\.]+$/)) {
                            track[key] = parseFloat(track[key]);
                        }
                    }
                    if (tracks[track.type]) {
                        tracks[track.type].push(track)
                    } else {
                        tracks[track.type] = [track];
                    }
                });
                cb(tracks);
            }
        });
    }
}
