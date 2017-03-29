module.exports = function paginate(github, callback, collector = []) {
  return function (response) {
    return Promise.resolve(callback(response)).then(result => {
      collector.push(result);
      if (github.hasNextPage(response)) {
        return github.getNextPage(response).then(paginate(github, callback, collector));
      } else {
        return collector;
      }
    });
  };
};
