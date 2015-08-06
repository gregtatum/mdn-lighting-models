# Lighting Models for WebGL
## Taking a bunny from flat to shiny

Getting a model projected onto the screen using WebGL is only the first step for working in 3d. The next is applying a shading or lighting model to it. This content kit walks through the steps on how to build the classic Lambertian lighting model and the Blinn Phong lighting model.

Lesson                  | JSFiddle                                                 | Code                                                    | Time Estimation |
----------------------- | ---------------------------------------------------------| ---------------------------------------------------------------- | ------ |
No Lighting             | TODO                                                     | [01-no-lighting](lessons/01-no-lighting)                         | 15 min |
Normal Lighting         | TODO                                                     | [02-normal-lighting](lessons/02-normal-lighting)                 | 15 min |
Transform Normals       | TODO                                                     | [03-transform-normals](lessons/03-transform-normals)             | 15 min |
Lambert Lighting        | TODO                                                     | [04-lambert-lighting](lessons/04-lambert-lighting)               | 20 min |
Blinn Phong Lighting    | TODO                                                     | [05-blinn-phong-lighting](lessons/05-blinn-phong-lighting)       | 20 min |

## Getting started (10 min)

The lessons can either be worked online from JSFiddle, or downloaded and explored locally. The content of the lessons is mixed in with the code. The `script.js` files contain most of the lesson, while the `index.html` contains the HTML and shader code. To download these files either [grab the zip file](https://github.com/TatumCreative/mdn-lighting-models/archive/master.zip) or run `git clone git@github.com:TatumCreative/mdn-lighting-models.git` from the command line.

#### Working locally checklist

 1. Verify that [WebGL works on your machine](https://get.webgl.org/).
 2. Download the lesson files to your machine.
 3. Open the lessons in the browser:
   * Either open the index.html files from the lessons in your browser
   * Or if you are serving files with a local webserver, make sure and serve them from the root directory of the content kit so that the shared js files can be correctly loaded in.

#### Working on JSFiddle checklist

 1. Verify that [WebGL works on your machine](https://get.webgl.org/).
 2. Visit the JSFiddle links

## Lesson requirements

These lessons require a [browser and device that support WebGL](https://get.webgl.org/). The browsers that support these features are Firefox 4+, Google Chrome 9+, Opera 12+, Safari 5.1+ and Internet Explorer 11+. Be aware that not all devices support WebGL even if the browsers do. There are many tutorials available throughout the web on graphics programming, but this content kit specifically targets web developers. It's assumed that the audience is familiar with an intermediate level web development, markup, and JavaScript.

## Updates and Correction

[Submit an issue](./issues) or a [pull request](https://help.github.com/articles/using-pull-requests/) for any corrections or updates. For a history of the updates visit the [commit history](https://github.com/TatumCreative/mdn-lighting-models/commits/master).