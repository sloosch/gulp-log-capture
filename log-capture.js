var through = require('through2');
var utilFmt = require('util').format;
var path = require('path');
var stacktrace = require('stack-trace').get;
var File = require('gulp-util').File;
var PluginError = require('gulp-util').PluginError;

var LogBuffer = function(obj, fnName) {
	this.obj = obj;
	this.fnName = fnName;
	this.data ={};
	this.original = obj[fnName];
	var self = this;
	obj[fnName] = function() {
		self.log.apply(self, arguments);
	};
};

LogBuffer.prototype = {
	hasObj : function(obj, fnName) {
		return obj === this.obj && this.fnName == fnName;
	},
	
	revert : function() {
		this.obj[this.fnName] = this.original;	
	},
	
	log : function() {
		var stack = stacktrace();
		var name = nameWithoutExtension(stack[2].getFileName());
		if(!(name in this.data)) {
			this.data[name] = '';
		}
		this.data[name] += utilFmt.apply(utilFmt, arguments);
		this.original.apply(this.original, arguments);
	},
	
	createLogFilesForFile : function(file, desiredExtension) {
		var fileName = nameWithoutExtension(file.path);
		var files = [];
		for(var bufferName in this.data) {
			var bufferData = this.data[bufferName];
			if(bufferData.length > 0) {
				var logFile = new File({
				  cwd: file.cwd,
				  base: file.base,
				  path: file.base + fileName + '-' + bufferName + '-' + this.fnName + '.' + desiredExtension,
				  contents: new Buffer(bufferData)
				});
				files.push(logFile);
			}
		}
		return files;
	}
};

var buffers = [];

var bufferForObj = function(obj, fnName) {
	var buffer = null;
	for(var i = 0; i < buffers.length && buffer === null; i++) {
		if(buffers[i].hasObj(obj,fnName)) {
			buffer = buffers[i];
		}
	}
	return buffer;
};

var nameWithoutExtension = function(filepath) {
	return path.basename(filepath, path.extname(filepath));
};

var startCapturing = function(obj, fnName) {
	if(bufferForObj(obj, fnName) === null) {
		buffers.push(new LogBuffer(obj, fnName));
	}
};

var endCapturing = function() {
	for(var i = 0; i < buffers.length; i++) {
		buffers[i].revert();
	}
	buffers.length = 0;
};

var capturingTask = null;

var start = function(obj, fnName) {
	var callingTask = stacktrace()[1].getFunction();
	if(capturingTask !== null && callingTask !== capturingTask) {
		endCapturing();
		throw new PluginError('gulp-log-capture', 'Concurrent capturing is not supported!');
	}
	capturingTask = callingTask;
	return through.obj(function(file, enc, cb) {
		startCapturing(obj, fnName);
		this.push(file);
		cb();
	});
};

var stop =  function(extension) {
	capturingTask = null;
	return through.obj(function(file, enc, cb) {
		var fileName = nameWithoutExtension(file.path);
		for(var i = 0; i < buffers.length; i++) {
			var logFiles = buffers[i].createLogFilesForFile(file, extension);
			for(var i = 0; i < logFiles.length; i++) {
				this.push(logFiles[i]);
			}
		}
		endCapturing();
		cb();
	});
};

module.exports = {
	start : start,
	stop : stop,
	LogBuffer : LogBuffer,
	buffers : buffers
};