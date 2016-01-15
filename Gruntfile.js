module.exports = function(grunt) {

    var glob = require('glob');

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        tintin_root: process.env.TINTIN_ROOT,
        pkg: grunt.file.readJSON('package.json'),
        rockyjs_path: "dist/rocky-<%=pkg.version%>.js",
        uglify: {
            options: {
                banner: '/* <%=pkg.license%> */\n\n'
            },
            applib: {
                src: '<%= tintin_root %>/build/applib/applib-targets/emscripten/applib.js',
                dest: 'src/transpiled.js'
            }
        },
        concat: {
            options: {
                stripBanners: true,
                banner: '/* <%=pkg.license%> */\n\n'
            },
            rockyjs: {
                src: ['src/html-binding.js', 'src/symbols-manual.js', 'src/symbols-generated.js',
                      'src/transpiled.js'],
                dest: '<%= rockyjs_path %>'
            }
        },
        newer: {
            options: {
                cache: '.cache'
            }
        },
        processhtml: {
            examples:{
                options: {
                    process: true,
                    data: {rockyjs_path: "<%=rockyjs_path%>"}
                },
                files: [
                    {
                        expand: true,
                        cwd: 'examples',
                        src: ['**/*.*', '!**/*.md'],
                        dest: 'build/examples'
                    },
                    {
                        expand: true,
                        cwd: 'html',
                        src: ['css/*'],
                        dest: 'build'

                    }
                ]
            }
        },
        md2html: {
            all: {
                files: [
                    {
                        expand: true,
                        src: ['*.md'],
                        dest: 'build',
                        ext: '.html',
                        rename: function(dir, file) {
                            // readme.html -> index.html
                            return dir + "/" + file.replace(/(\breadme)\.html$/, "/index.html")
                        }
                    }
                ],
                options: {
                    basePath: 'build',
                    layout: 'html/markdown/template.html'
                }
            }
        },
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        src: ['dist/**/*'],
                        dest: 'build'
                    }
                ]
            }
        },
        jshint: {
            src: ['src/**/*.js', '!src/transpiled.js', 'examples/**/*.js', '!examples/interactive/js/TangleKit/**/*.js'],
            test: ['test/**/*.js']
        },
        mochaTest: {
            all: {
                src: ['test/**/*.js']
            }
        },
        'gh-pages': {
            options: {
                base: 'build'
            },
            publish: {
                src: ['**']
            },
            'publish-ci': {
                options: {
                    user: {
                        name: 'travis',
                        email: 'travis@pebble.com'
                    },
                    repo: 'https://' + process.env.GH_TOKEN + '@github.com/pebble/rockyjs.git',
                    message: 'publish gh-pages (auto)' + getDeployMessage(),
                    silent: true // don't leak the token
                },
                src: ['**/*']
            }
        }
    });

    // see http://bartvds.github.io/demo-travis-gh-pages/
    function getDeployMessage() {
        var ret = '\n\n';
        if (process.env.TRAVIS !== 'true') {
            ret += 'missing env vars for travis-ci';
            return ret;
        }
        ret += 'branch:       ' + process.env.TRAVIS_BRANCH + '\n';
        ret += 'SHA:          ' + process.env.TRAVIS_COMMIT + '\n';
        ret += 'range SHA:    ' + process.env.TRAVIS_COMMIT_RANGE + '\n';
        ret += 'build id:     ' + process.env.TRAVIS_BUILD_ID  + '\n';
        ret += 'build number: ' + process.env.TRAVIS_BUILD_NUMBER + '\n';
        return ret;
    }

    grunt.registerTask('publish-ci', function() {
        // need this
        this.requires(['build']);

        // only deploy under these conditions
        if (process.env.TRAVIS === 'true' && process.env.TRAVIS_SECURE_ENV_VARS === 'true' && process.env.TRAVIS_PULL_REQUEST === 'false') {
            grunt.log.writeln('executing deployment');
            // queue deploy
            grunt.task.run('gh-pages:publish-ci');
        }
        else {
            grunt.log.writeln('skipped deployment');
        }
    });

    var build_tasks = ['jshint:src'];

    // only run uglify per default if transpiled applib exists at TINTIN_ROOT
    if (glob.sync(grunt.config('uglify').applib.src).length > 0) {
        build_tasks.push("newer:uglify:applib");
    } else {
        grunt.verbose.write("Cannot find transpiled applib at " + grunt.config('uglify').applib.src + " - skipping uglify")
    }

    build_tasks.push('concat:rockyjs', 'processhtml:examples', 'md2html', 'copy');

    grunt.registerTask('build', build_tasks);
    grunt.registerTask('default', ['build']);
    grunt.registerTask('test', ['jshint:test', 'mochaTest']);
    grunt.registerTask('publish', ['build', 'gh-pages:publish']);
};