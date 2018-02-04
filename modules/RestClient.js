async function createRestClient () {
  const _this = this;

  class RestClient {
    constructor () {
      this.consumerKey = _this.config.twitter.APIKey;
      this.consumerSecret = _this.config.twitter.secret;

      this.BASE_URL = 'api.twitter.com/1.1/';
      this.STREAM_URL = 'userstream.twitter.com/1.1/user.json';

      this.buildRoutes();
    }

    buildRoutes () {
      const routes = {
        'tweet'     : { type: 'post', endpoint: 'statuses/update.json'        },
        'like'      : { type: 'post', endpoint: 'favorites/create.json'       },
        'unlike'    : { type: 'post', endpoint: 'favorites/destroy.json'      },
        'retweet'   : { type: 'post', endpoint: 'statuses/retweet/:id.json'   },
        'unretweet' : { type: 'post', endpoint: 'statuses/unretweet/:id.json' },

        'follow'    : { type: 'post', endpoint: 'friendships/create.json'     },
        'unfollow'  : { type: 'post', endpoint: 'friendships/destroy.json'    },

        'friends'   : { type: 'get',  endpoint: 'friends/list.json'           }
      };

      for (const route in routes) {
        this[route] = async ({ oauth_token, oauth_secret }, params) => {
          const info = routes[route];
          for (const param in params) {
            if (info.endpoint.includes(`:${param}`)) {
              info.endpoint = info.endpoint.replace(`:${param}`, params[param]);
            }
          }

          return this.genericRequest(
            info.type,
            info.endpoint,
            oauth_secret,
            params,
            Object.assign({ oauth_token }, params)
          );
        };
      }
    }

    async getTagByID (id) {
      const cachedUser = _this.bot.users.get(id);
      if (cachedUser) {
        return `${cachedUser.username}#${cachedUser.discriminator}`;
      }
      const res = await _this.utils.get({
        url: `discordapp.com/api/v6/users/${id}`,
        headers: {
          'Authorization': _this.bot.token
        }
      });

      if (res.username) {
        return `${res.username}#${res.discriminator}`;
      } else {
        throw res;
      }
    }

    async createTweetStream ({ oauth_token, oauth_secret }, withFollowers) {
      withFollowers = withFollowers
        ? { with: 'followings' }
        : { with: 'user' };
      const OAuthData = _this.OAuthClient.signHeaders(
        'POST',
        this.STREAM_URL,
        Object.assign(withFollowers, { oauth_token }),
        oauth_secret
      ).join(',');

      const res = await _this.utils.post({
        url: this.STREAM_URL + _this.utils.qs.create(withFollowers),
        headers: {
          'Authorization': `OAuth ${OAuthData}`,
          'User-Agent': 'Tweetcord (github.com/aetheryx/tweetcord)',
          'Content-Length': '0'
        }
      }, '', true);

      if (res.error || res.errors) {
        throw res;
      }

      return res;
    }

    async genericRequest (method, endpoint, secret, qsData = {}, params = {}) {
      const url = this.BASE_URL + endpoint;
      const qs = _this.utils.qs.create(qsData);
      const OAuthData = _this.OAuthClient.signHeaders(method.toUpperCase(), url, params, secret).join(',');

      const res = await _this.utils[method]({
        url: url + qs,
        headers: {
          'Authorization': `OAuth ${OAuthData}`
        }
      });

      if (res.error || res.errors) {
        throw res;
      }

      return res;
    }
  }

  this.RestClient = new RestClient();
}

module.exports = {
  order: 2,
  func: createRestClient
};