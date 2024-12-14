/**
 * Tests creating and retrieving users on the db
 */
import chai from 'chai';
import sinon from 'sinon';
import request from 'request';
import UsersController from '../controllers/UsersController.js';

const expect = chai.expect;

describe('POST /users', function() {
  // Create a stub that replicates UsersController.postNew
  let newStub;

  beforeEach(function() {
    const body = {id: 1, email: 'johnsmith@email.com'};
    newStub = sinon.stub(UsersController, 'postNew')
      .resolves(body);
  });

  // restore the original implementation of postNew after each test
  afterEach(function() {
    newStub.restore()
  });

  // Test the creation of the user using the stub method
  it('Creates a new user', function(done) {
    const options = {
      url: 'http://localhost:5000/users',
      method: 'POST',
      body: JSON.stringify({email: 'johnsmith@email.com', password: 'johnsmith'}),
      headers: {
	'Content-Type': 'application/json'
      }
    };

    request(options, function(err, resp, body) {
      if (err) {
	return done(err);
      }
      const respBody = JSON.parse(body);

      expect(resp.statusCode).to.equal(201);
      expect(respBody.id).to.equal(1);
      expect(respBody.email).to.equal('johnsmith@email.com');
      done();
    });
  });

  // Error on missing password
  it('Returns an error json msg when password isnt passsed', function(done) {
    const options = {
      url: 'http://localhost:5000/users',
      method: 'POST',
      body: {email: 'johnsmith@email.com'},
      json: true,  // auto parse json response
    };

    request(options, function(err, resp, body) {
      if (err) {
	return done(err);
      }

      expect(body.error).to.equal('Missing password');
      expect(resp.statusCode).to.equal(400);
      done();
    });
  });

  // Error on missing email
  it('Returns an error json msg when email isnt passed', function(done) {
    const options = {
      url: 'http://localhost:5000/users',
      json: true,
      method: 'POST',
      body: {password: 'johnsmith'}
    };

    request(options, function(err, resp, body) {
      if (err) {
	return done(err);
      }

      expect(body.error).to.equal('Missing email');
      expect(resp.statusCode).to.equal(400);
      done();
    });
  });
});


// Test users/me
describe('GET /users/me', function() {
  let newStub;
  
  beforeEach(function() {
    const respBody = {id: '1', email: 'johnsmith@email.com'};
    newStub = sinon.stub(UsersController, 'getMe').resolves(respBody);
  });

  afterEach(function() {
    newStub.restore();
  });

  it('Returns the user by the token passed i the header', function(done) {
    
  });
});
