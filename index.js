const fs = require("fs");
const elstart = new RegExp("<(?!/)(.[^]+?)>", "gm");
const attrreg = new RegExp('([A-z]+=")(.*?)"', "g");
const clipboardListener = require("clipboard-event");

function extractReplace(data) {
    let css = {};
    let namearr = [];
    while ((match = elstart.exec(data)) !== null) {
        let tagname = match[1].split(" ")[0];
        let classname;
        let styles;
        let classline;
        let id;
        if (match[1].includes('style="')) {
            while ((attr = attrreg.exec(match[1])) !== null) {
                attr[1] = attr[1].replace('="', "");
                if (
                    attr[1].includes("class") ||
                    attr[1].includes("className") ||
                    attr[1].includes("styleClass")
                ) {
                    classname = attr[2].split(" ")[0];
                    classline = attr[0].substring(0, attr[0].length - 1);
                }
                if (
                    attr[1].includes("style") &&
                    !attr[1].includes("styleClass") &&
                    !attr[2].includes("#{")
                ) {
                    styles = attr[2];
                }
                if (attr[1].includes("id")) {
                    let split = attr[2].split(/(?=[A-Z])/);
                    id =
                        split[0].substring(0, 3) +
                        (split[1] ? split[1].substring(0, 3) : "");
                }
            }
            console.log(classline);

            if (!id) {
                let count = namearr.filter((x) => x == id).length;
                if (count > 0) {
                    id = tagname.replace(":", "").substring(0, 4) + count;
                } else {
                    id = tagname.replace(":", "").substring(0, 4);
                }
            }
            if (id) {
                namearr.push(id);
            }
            let key = getKeyByValue(css, styles);
            if (key) {
                id = key;
            }
        }
        if (styles) {
            let identifier = id.replaceAll(".", "");
            if (classname) {
                css["." + classname] = styles;
            } else {
                css["." + identifier] = styles;
            }
            //Replace inline styles in element
            let mod = match[0];
            let stylereg = new RegExp('.style="' + styles + '"', "g");
            mod = mod.replaceAll(stylereg, "");
            if (!mod.includes(identifier) || !classline) {
                if (classline) {
                    mod = mod.replaceAll(classline, classline + " " + identifier);
                } else {
                    let parts = mod.split('style="');
                    if (tagname.includes(":")) {
                        mod = parts[0] + `className="${identifier}"` + parts[1];
                    } else {
                        if (parts.length > 1) {
                            mod =
                                parts[0] +
                                `class="${identifier}" ${
                  parts[1] ? `style=" ${parts[1]}}` : ""
                }`;

            } else {
              let tagparts = mod.split(tagname);
              mod =
                tagparts[0] + tagname + ` class="${identifier}" ${tagparts[1]}`;
            }
          }
        }
      }
      data = data.replace(match[0], mod);
    }
  }
  console.log(css);
  return [data, css];
}

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

function fillStyle(data) {
  let [newdata, css] = extractReplace(data);
  let styleelarr = [];
  for (let [key, value] of Object.entries(css)) {
    styleelarr.push(`${key} {
            ${value}
        }`);
  }
  if (newdata.includes("<style>")) {
    newdata = newdata.replaceAll(
      "<style>",
      `<style> 
        ${styleelarr.join("\n     ")}`
    );
  } else {
    newdata = newdata.replace(
      '/ui">',
      `/ui">
          <style>
          ${styleelarr.join("\n")}
            </style>`
    );
  }
  return newdata;
}

function fileOp() {
  fs.readdir("Files/", function (err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function (filename) {
      fs.readFile("Files/" + filename, "utf8", function (err, data) {
        if (err) {
          onError(err);
          return;
        }

        let newdata = fillStyle(data);
        fs.writeFile("Files/" + filename + ".new", newdata, function (err) {
          if (err) {
            onError(err);
            return;
          }
          console.log("The file has been saved!");
        });
      });
    });
  });
}

//function clipOp(clipboardy) {
//  let newdata = fillStyle(clipboardy.default.readSync());
//  console.log(newdata);
//  if(newdata!=''){
//    clipboardy.default.writeSync(newdata);
//  }
//}
fileOp();
import("clipboardy").then((clipboardy) => {
  clipboardListener.startListening();
  clipboardListener.on("change", () => {
    let newdata = fillStyle(clipboardy.default.readSync());
    clipboardListener.stopListening();
    clipboardy.default.writeSync(newdata);
   
    clipboardListener.startListening();
  });
});