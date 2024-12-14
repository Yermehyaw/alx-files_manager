/**
 * Test the /status endpoint
 */
import chai from 'chai';
import request from 'request';

const expect = chai.expect;

describe('GET /status', function() {
  it('Checks the status of the redis and mongo clients', function(done) {
    const options = {
      url: 'http://localhost:5000/status',
      json: true,
      method: 'GET'
    };
    request(options, function(err, resp, body) {
      if (err) {
	return done(err);  // stop further tests
      }
      expect(resp.statusCode).to.equal(200);
      expect(body.redis).to.be.true;
      expect(body.db).to.be.true;
      done();  // test passed successfullly, proceed to other tests
    });
  });
});

describe('GET /stats', function() {
  it('Gets the no of active users and files on the db', function(done) {
    request('http://localhost:5000/stats', function(err, resp, body) {
      if (err) {
	return done(err);
      }
      const parsedBody = JSON.parse(body);
      expect(resp.statusCode).to.equal(200);
      expect(parsedBody.users).to.be.a('number');
      expect(parsedBody.files).to.be.a('number');
      expect(parsedBody.users).to.be.at.least(0);
      expect(parsedBody.files).to.be.at.least(0);
      done();
    });
  });
});
