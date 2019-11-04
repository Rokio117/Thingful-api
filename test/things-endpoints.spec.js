const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe.skip('Things Endpoints', function() {
  let db;

  const { testUsers, testThings, testReviews } = helpers.makeThingsFixtures();

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

  function makeAuthHeader(user) {
    const token = Buffer.from(`${user.user_name}:${user.password}`).toString(
      'base64'
    );
    return `Basic ${token}`;
  }

  describe(`Protected endpoints`, () => {
    this.beforeEach('insert things', () =>
      helpers.seedThingsTables(db, testUsers, testThings, testReviews)
    );
    const protectedEndpoints = [
      { name: 'GET /api/things/:things_id', path: '/api/things/1' }
    ];
    protectedEndpoints.forEach(endpoint => {
      describe(endpoint.name, () => {
        it(`responds with 401 'Missing bearer token' when no bearer token`, () => {
          return supertest(app)
            .get(endpoint.path)
            .expect(401, { error: `Missing bearer token` });
        });
      });
      it(`responds 401 'Unathorized request' when invalid JWT secret`, () => {
        const validUser = testUsers[0];
        const invalidSecret = 'bad-secret';
        return endpoint
          .method(endpoint.path)
          .set(
            'Authorization',
            helpers.makeAuthHeader(validuser, invalidSecret)
          )
          .expect(401, { error: `Unauthorized request` });
      });
      it.skip(`responds 401 'Unauthorized request' when invalid sub in payload`, () => {
        const invalidUser = { user_name: 'user-not-existy', id: 1 };
        return endpoint
          .method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(invalidUser))
          .expect(401, {
            error: `Unauthorized request`
          });
      });
    });
  });

  describe(`GET /api/things`, () => {
    before('cleanup', () => helpers.cleanTables(db));
    beforeEach('cleanup', () => helpers.cleanTables(db));
    context(`Given no things`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/things')
          .expect(200, []);
      });
    });

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it('responds with 200 and all of the things', () => {
        const expectedThings = testThings.map(thing =>
          helpers.makeExpectedThing(testUsers, thing, testReviews)
        );
        return supertest(app)
          .get('/api/things')
          .expect(200, expectedThings);
      });
    });

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1];
      const { maliciousThing, expectedThing } = helpers.makeMaliciousThing(
        testUser
      );

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(db, testUser, maliciousThing);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedThing.title);
            expect(res.body[0].content).to.eql(expectedThing.content);
          });
      });
    });
  });

  describe(`GET /api/things/:thing_id`, () => {
    context(`Given wrong ID`, () => {
      beforeEach(() => {
        db.into('thingful_users').insert(testUsers);
      });
      it(`responds with 404`, () => {
        const thingId = 123456;
        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` });
      });
    });

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it('responds with 200 and the specified thing', () => {
        const thingId = 2;
        const expectedThing = helpers.makeExpectedThing(
          testUsers,
          testThings[thingId - 1],
          testReviews
        );

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(200, expectedThing);
      });
    });

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1];
      const { maliciousThing, expectedThing } = helpers.makeMaliciousThing(
        testUser
      );

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(db, testUser, maliciousThing);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things/${maliciousThing.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedThing.title);
            expect(res.body.content).to.eql(expectedThing.content);
          });
      });
    });
  });

  describe(`GET /api/things/:thing_id/reviews`, () => {
    context(`Given no things`, () => {
      it(`responds with 404`, () => {
        const thingId = 123456;
        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` });
      });
    });

    context('Given there are reviews for thing in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it('responds with 200 and the specified reviews', () => {
        const thingId = 1;
        const expectedReviews = helpers.makeExpectedThingReviews(
          testUsers,
          thingId,
          testReviews
        );

        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(200, expectedReviews);
      });
    });
  });
});
