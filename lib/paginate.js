// Get an instance of the GitHub client to handle pagination
const github = require('github')();

module.exports = function paginate(callback, collector = []) {
  return function(response) {
    return Promise.resolve(callback(response)).then(result => {
      collector.push(result);
      if (github.hasNextPage(response)) {
        return github.getNextPage(response).then(paginate(callback, collector));
      } else {
        return collector;
      }
    });
  }
};
