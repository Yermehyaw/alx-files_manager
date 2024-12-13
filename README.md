# alx-files_manager
A simple file manager expressjs app to browse and store files on a mongoDB server. The client must be logged in with a valid redis session token.

## Start app
```
node server.js &
```
NOTE: Ensure your mongoDB and redus server are running in the background prior to attampting to start the app.

## Endpoints
GET [/status](./controllers/AppController.js)
GET [/stats](./controllers/AppController.js)
GET [/connect](./controllers/AuthController.js)
GET [/disconnect](./controllers/AuthController.js)
POST [/users](./controllers/UsersController.js)
GET [/users/me](./controllers/UsersController.js)
POST [/files](./controllers/FilesController.js)
GET [/files/:id](./controllers/FilesController.js)
GET [/files](./controllers/FilesController.js)
PUT [/files/:id/publish](./controllers/FilesController.js)
PUT [/files/:id/unpublish](./controllers/FilesController.js)
GET [/files/:id/data](./controllers/FilesController.js)

The [routes file](./routes/index.js) holds the appr method which implements the logic of the various endpoints

## Contributions
Visit [App interface] and change its hosting to receive external requests OR build the /files endpoint to enable file sgating across multiple users
