# Info

This is a wrapper project that provides a very basic interface over the raytracer developed at the RayTracing course at FMI.
It provides a basic web interface and a node back-end server that offloads rendering work onto remote workers.
Each remote worker needs a copy of the native raytracer and receives jobs by the master server to process.

This project was created as part of the Advanced JavaScript and Raytracing courses at [FMI][FMI].

The original raytracer can be found here on [Github][anrieff-repo].
The modified version that implements the features required for this project is also on [Github][lachezar-repo].

### Tech

The following number of technologies are used in this project:

* [Twitter Bootstrap] - great UI boilerplate for modern web apps
* [node.js] - evented I/O for the backend
* [Express] - fast node.js network app framewokrex
* [Socket.io] - a very good abstraction on top of web sockets
* [SDL] - used by the underlying raytracer for hardware abstraction, threading, visualization and more



### Using the project

There are two modules of the application: the server and the workers.


First, the server should be run using the *bin\www* file providing a specific port to use.

After a server is running, attaching nodes is done via the *worker.js* file under *Dis.RayTracer.Worker*. The worker expects the hostname and port to connect to as specified below.

```sh
$ node worker.js <hostname>:<port>
```
For example:
```sh
$ node worker.js localhost:1337
```

With the server up and workers connected, the UI can be accessed at the configured port. From there, selecting users and rendering can begin.

License
----

MIT

[anrieff-repo]: https://github.com/anrieff/trinity
[lachezar-repo]: https://github.com/Tsonov/trinity
[FMI]: http://fmi.uni-sofia.bg/
[Express]: http://expressjs.com/
[Socket.io]: http://socket.io/
[Twitter Bootstrap]: http://getbootstrap.com
[SDL]: https://www.libsdl.org/
