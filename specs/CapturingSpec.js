var expect = require('chai').expect;
var sinon  = require('sinon');
var logCapture = require('../log-capture');
var File = require('gulp-util').File;
var through = require('through2');


describe('capturing', function() {
	var throughObjStub;
	var firstThroughObj;
	var sndThroughObj;
	var firstThroughCb;
	var sndThroughCb;
	var testFile;
	var obj;
	
	
	beforeEach(function() {
		obj = {
			log : sinon.spy()
		}
		firstThroughObj = {	
			push : sinon.spy()
		};
		sndThroughObj = {	
			push : sinon.spy()
		};
		testFile = new File();
		firstThroughCb = sinon.spy();
		sndThroughCb = sinon.spy();
		throughObjStub = sinon.stub(through, 'obj');
		throughObjStub.onFirstCall().yieldsOn(firstThroughObj, testFile, 'utf-8', firstThroughCb);
		throughObjStub.onSecondCall().yieldsOn(sndThroughObj, testFile, 'utf-8', sndThroughCb);
		throughObjStub.yieldsOn({push : function(){}}, testFile, 'utf-8', function() {});
	});
	
	afterEach(function() {
		logCapture.stop();
		throughObjStub.restore();
	});
	
	it('should add another buffer for a differnt logging object', function(){
			var anotherObj = {
				log2 : function() {}
			}
			logCapture.start(obj, 'log');
			logCapture.start(anotherObj, 'log2');
			expect(logCapture.buffers.length).to.be.equal(2);
	});
	
	it('should resuse the same buffer for the same object and log function', function(){
			logCapture.start(obj, 'log');
			logCapture.start(obj, 'log');
			expect(logCapture.buffers.length).to.be.equal(1);
	});
	
	it('should start the capturing', function() {
		logCapture.start(obj, 'log');
		expect(logCapture.buffers.length).to.be.equal(1);
		expect(firstThroughCb.called).to.be.true;
		expect(firstThroughObj.push.calledWith(testFile)).to.be.true;
	});
	
	it('should stop the capturing process', function() {
		logCapture.start(obj, 'log');
		obj.log('test');
		logCapture.stop();
		expect(logCapture.buffers.length).to.be.equal(0);
		expect(sndThroughCb.called).to.be.true;
		expect(sndThroughObj.push.called).to.be.true;
	});
	
	it('should not allow concurrent capturing', function() {
		var a = function() {
			logCapture.start(obj, 'log');	
		};
		var b = function() {
			logCapture.start(obj, 'log');
		};
		
		a();
		expect(b).to.throw(/Concurrent capturing is not supported/);
	});
});