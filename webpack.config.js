module.exports = {
  mode: 'development',
  // mode: 'production',
  entry: {
    app: ['./js/app.js']
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
  },
}