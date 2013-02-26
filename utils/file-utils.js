var fs = require("fs"),
    Path = require("path");

exports.fileUtils = {
    findFileByExtensions:findFileByExtensions,
    rmdirRecursive:rmdirRecursive,
    recursiveFileMap:recursiveFileMap,
    getSafeFileName:getSafeFileName,
    createDirectories:createDirectories,
    moveFile:moveFile,
    folderNameToFileName:folderNameToFileName,
    validateFilePath:validateFilePath
};

function findFileByExtensions(path, extns, cb, list){
    list = list || [];

    recursiveFileMap(
        path,
        findMap,
        cb,
        list
    );

    function findMap(cp, list, isDir, cb){
        var extn;
        if(!isDir){
            extn = Path.extname(cp).match(/[^\.]*$/).toString().toLowerCase();
            console.log("file:"+cp);
            console.log("extn:"+extn);
            if(extns[extn]){
                list.push({file:cp, extn:extn});
            }
        }
        cb();
    }
}

function rmdirRecursive(path, cb, list){
    list = list || [];
    cb = cb || function(){};

    recursiveFileMap(
        path,
        rmMap,
        cb,
        list
    );

    function rmMap(cp, list, isDir, cb){
        list.push(cp);
        if(isDir){
            fs.rmdir(cp, cb);
        }else{
            fs.unlink(cp, cb);
        }
    }
}

function recursiveFileMap(path, map, cb, list){
    list = list || [];
    fs.readdir(path, function(err, subPaths){

        var i = subPaths.length;
		
		if(i){
			subPaths.forEach(function(file){
				var currentPath = path+"/"+file;

				fs.stat(currentPath, function(err, fileStat){
					if(fileStat.isDirectory()){

						recursiveFileMap(currentPath, map, function(){
							map(currentPath, list, true, function(){
								checkDone();
							});
						}, list);

					}else if(fileStat.isFile()){

						map(currentPath, list, false, function(){
							checkDone();
						});

					}
				});

			});
		}else{			
			checkDone(true);
		}
		
		function checkDone(complete){
			i--;
			if(i === 0 || complete){
				map(path, list, true, function(){
					cb(list);
				});
			}
		}
    });
}

function getSafeFileName(targetPath, cb){
    var extension = targetPath.match(/^.*(\..*)$/)[1],
        i = 0,
        safePath = targetPath;

    checkPath();

    function checkPath(){
        fs.realpath(safePath, function(err, resPath){
            if(resPath){
                i++;
                console.log("Path Exists, incrementing file name: "+safePath);
                safePath = targetPath.replace(new RegExp(extension), "." + i + extension);
                checkPath();
            }else{
                cb(safePath);
            }
        });
    }
}

function createDirectories(path, cb){
    fs.realpath(path,function(err){
        if(err){
            console.log("Creating Folder: "+path);
            fs.mkdir(path, 0777, function(){
                cb(path);
            });
        }else{
            cb(path);
        }
    });
}

function moveFile(path, targetPath, cb){
    fs.realpath(targetPath, function(err){
        var exists = !err;
        if(exists){
            console.log("Duplicate file.");
            cb(null, targetPath, exists);
        }else{
            fs.rename(path, targetPath, function(err){
                if(err){
                    console.log("Error Moving File: "+err);
                    cb(err);
                }else{
                    console.log("Episode moved to: "+targetPath);
                    cb(null, targetPath);
                }
            });
        }
    });
}

function folderNameToFileName(path, file, extn, cb){
    var fixedFileName = path + '/' + path.match(/[^\/]*(?=$|\/$)/) + '.' + extn;

    fs.rename(file, fixedFileName, function(err){
        if(err){
            console.log("Error renaming file: "+err);
        }
        cb(fixedFileName);
    });
}

function validateFilePath(path, cb){
    fs.realpath(path,function(err,path){
        if(err){
            console.log("Error: Invalid Path");
            return null;
        }
        fs.stat(path, function(err, stat){
            if(stat.isDirectory){
                cb();
            }else{
                cb(new Error("Path is not a directory"));
            }
        });
    });
}