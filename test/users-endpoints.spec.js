const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe.only('Users Endpoints', function() {
  let db;

  const { testUsers, testThings } = helpers.makeThingsFixtures();
  const testUser = testUsers[0];

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  describe(`POST /api/users`, () => {
    context(`User Validation`, () => {
      beforeEach('insert users', () =>
        helpers.seedThingsTables(db, testUsers, testThings)
      );

      const requiredFields = ['user_name', 'password', 'full_name'];

      requiredFields.forEach(field => {
        const registerAttemptBody = {
          user_name: 'test user_name',
          password: 'test password',
          full_name: 'test full_name',
          nickname: 'test nickname'
        };

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field];

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`
            });
        });
        it(`responds 400 'Password must be longer than 8 characters' when empty password`, () => {
          const userShortPassword = {
            user_name: 'test user_name',
            password: '123456',
            full_name: 'test full_name'
          };
          return supertest(app)
            .post('/api/users')
            .send(userShortPassword)
            .expect(400, {
              error: `Password must be longer than 8 characters`
            });
        });
        it(`responds 400 'Password must be less than 72 characters' when long password`, () => {
          const userLongPassword = {
            user_name: 'test user_name',
            password: `*`.repeat(73),
            full_name: 'test full_name'
          };
          return supertest(app)
            .post('/api/users')
            .send(userLongPassword)
            .expect(400, { error: `Password must be less than 72 characters` });
        });
        it(`responds 400 error when password starts with spaces`, () => {
          const userPasswordStartsSpaces = {
            user_name: 'test user_name',
            password: ` 1Aa!2Bb@`,
            full_name: 'test full_name'
          };
          return supertest(app)
            .post('/api/users')
            .send(userPasswordStartsSpaces)
            .expect(400, {
              error: `Password must not start or end with empty spaces`
            });
        });
        it(`responds 400 error when password ends with spaces`, () => {
          const userPasswordEndsSpaces = {
            user_name: 'test user_name',
            password: `1Aa!2Bb@ `,
            full_name: 'test full_name'
          };
          return supertest(app)
            .post('/api/users')
            .send(userPasswordEndsSpaces)
            .expect(400, {
              error: `Password must not start or end with empty spaces`
            });
        });
        it(`responds 400 error when password isn't complex enough`, () => {
          const userPasswordnotComplex = {
            user_name: 'test user_name',
            password: `11AAaabb`,
            full_name: 'test full_name'
          };
          return supertest(app)
            .post('api/users')
            .send(userPasswordnotComplex)
            .expect(400, {
              error: `Password must contain 1 upper case, lower case, number and special character`
            });
        });
        it.only(`responds 400 'User name already taken' when user_name isn't unique`, () => {
          const duplicateUser = {
            user_name: testUser.user_name,
            password: `11AAaa!!`,
            full_name: 'test full_name'
          };

          return supertest(app)
            .post('./api/users')
            .send(duplicateUser)
            .expect(400, { error: `username already taken` });
        });
      });
    });
  });
});
