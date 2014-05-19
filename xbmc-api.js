var netUtils = require("./utils/net-utils"),
    xbmcServerURLs = require("./config").xbmcServerURLs;


exports.updateXBMC = updateXBMC;
exports.updateAllXBMCServers = updateAllXBMCServers;

function updateAllXBMCServers(){
    var i = 0;
    for( var server in xbmcServerURLs){
        var url = xbmcServerURLs[server];
        setTimeout(updateXBMC, 15000 * i, url, server);
        i++;
    }
}

function updateXBMC(url,server){
    netUtils.getURL(url, function(err, data){
        if(err){
            console.log("Error updating "+server+"'s library.");
        }else{
            console.log(server+"'s library updated successfully.");
        }
    });
}