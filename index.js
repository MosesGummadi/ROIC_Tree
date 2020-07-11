var parsers = [new formulaParser.Parser(), new formulaParser.Parser()];
var draw = SVG('drawing').size("100%", window.innerHeight).panZoom({zoomMin: 0.2, zoomMax: 2});
var palette = SVG('palette_canvas').size("100%", 250);
var boxes = new Boxes();
if(location.hash.split('/')[1]) {
  boxes.load(location.hash.split('/')[1]);
  $("#palette").remove();
  $("#drawing").css('left', 0);
}
// $(".ui.editbox.modal").draggable({
//   addClasses: false
// });
// $(".ui.editbox.modal").draggabilly({
//   // options...
// })
var fontsize = "14px";
var boxCounter = 0;
var links = draw.group();
var markers = draw.group();
var nodes = draw.group();
var paletteNodes = palette.group();
var myBoxes = [];
var connections = [];
var connecting = {
  source: false,
  target: false
}
var tmpConnect;
var context = createContextElement();
var draggingBox;
var permissions = {
  dragBoxes: true,
  changeValue: true,
  changeFormula: true,
  changeLabel: true,
  deleteBoxes: true,
  deleteArrows: true
};
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};
String.prototype.float = function() {
  var target = this;
  if(target.match(/\-|\d|\./g, "")) {
    return Number(target.match(/\-|\d|\./g, "").join("")); 
  } else {
    return 0;
  }
  // return Number(target.replace(/[^0-9\.-]+/g,""));
};

function Boxes() {
  Boxes.prototype.count = function() {
    var count = 0;
    for (var label in this) {
      if (this.hasOwnProperty(label)) {
        count++;
      }
    }
    return count;
  };
  Boxes.prototype.save = function(title, permissions, cb) {
    var data = [];
    for (var label in this) {
      if (!this.hasOwnProperty(label)) continue;
      var box = this[label];
      var prop = {
        label: box.getLabel(),
        formula: box.formula,
        values: box.getFormattedValues(),
        decimals: box.decimals,
        seperator: box.seperator,
        prefix: box.prefix,
        suffix: box.suffix,
        color: box.color,
        cons: [],
        position: {
          x: box.box.x(), y: box.box.y()
        }
      }
      if (box.box.cons) {
        for (var i = 0; i < box.box.cons.length; i++) {
          prop.cons.push(box.box.cons[i].target.label);
        }
      }
      data.push(prop);
    }
    $.post('save.php', {title: title, permissions: permissions, boxes: data}, function(res){
      cb(res);
    });
  };
  Boxes.prototype.load = function(id, cb) {
    for (var label in this) {
        if (!this.hasOwnProperty(label)) continue;
        var box = this[label];
        if (box.box.cons) {
          for (var i = 0; i < box.box.cons.length; i++) {
            box.box.cons[i].remove();
          }
        }
        if (box.box.sources) {
          for (var i = 0; i < box.box.sources.length; i++) {
            box.box.sources[i].remove();
          }
        }
        box.box.remove();
        cleanConnection();
        delete this[box.box.label];
    }
    $.get('load.php?id='+id, function(res) {
      permissions = res.permissions;
      for (var i = 0; i < res.boxes.length; i++) {
        var newBox = new createBox(nodes, res.boxes[i].position.x, res.boxes[i].position.y, res.boxes[i].label, res.boxes[i].formula, (res.boxes[i].values || [0,0]));
        myBoxes.push(newBox);
        newBox.setColor(res.boxes[i].color);
        newBox.setFormat((res.boxes[i].prefix || ''), (res.boxes[i].suffix || ''), (res.boxes[i].seperator || ''), (res.boxes[i].decimals || ''), (res.boxes[i].negative || ''));
        newBox.evaluate();
      }
      for (var i = 0; i < res.boxes.length; i++) {
        if (res.boxes[i].cons) {
          for (var j = 0; j < res.boxes[i].cons.length; j++) {
            connectBoxAuto(boxes[res.boxes[i].label].box, boxes[res.boxes[i].cons[j]].box);
          }
        }
      }
    }, 'json');
  };
}

var boxPaletteMockup = new createBox(paletteNodes,50,50,'','',[' ',' '],'mockup');
delete boxes['']; boxCounter--; 
var singleBoxPaletteMockup = new createBox(paletteNodes,50,150,'','',[' '],'mockup');
delete boxes['']; boxCounter--;
delete boxPaletteMockup.__proto__.evaluate; delete singleBoxPaletteMockup.__proto__.evaluate;
delete boxPaletteMockup.__proto__.getLabel; delete singleBoxPaletteMockup.__proto__.getLabel;
delete boxPaletteMockup.__proto__.getValues; delete singleBoxPaletteMockup.__proto__.getValues;
delete boxPaletteMockup.__proto__.setLabel; delete singleBoxPaletteMockup.__proto__.setLabel;
delete boxPaletteMockup.__proto__.setValues; delete singleBoxPaletteMockup.__proto__.setValues;
delete boxPaletteMockup.__proto__.setFormula; delete singleBoxPaletteMockup.__proto__.setFormula;
var boxMockup;

boxPaletteMockup.box.on('beforedrag', (e) => {
  console.log(e);
  console.log('before dragging');
  boxPaletteMockup.box.move(e.detail.event.clientX - 100, e.detail.event.clientY - 0);
});
singleBoxPaletteMockup.box.on('beforedrag', (e) => {
  console.log(e);
  console.log('before dragging');
  singleBoxPaletteMockup.box.move(e.detail.event.clientX - 100, e.detail.event.clientY - 0);
});
boxPaletteMockup.box.on('dragstart', (e) => {
  console.log('dragging started');
  draggingBox = boxPaletteMockup;
  var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 0 0").split(" ");
  boxMockup = new createBox(nodes, -300+parseInt(viewBox[0], 10),0+parseInt(viewBox[1], 10),'Var_'+boxCounter,'',[0,0]);
});
singleBoxPaletteMockup.box.on('dragstart', (e) => {
  console.log('dragging started');
  draggingBox = singleBoxPaletteMockup;
  var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 0 0").split(" ");
  boxMockup = new createBox(nodes,-300+parseInt(viewBox[0], 10),0+parseInt(viewBox[1], 10),'Var_'+boxCounter,'',[0]);
  // boxPaletteMockup.box.move(e.detail.p.x - 100, e.detail.p.y - 150);
});
// boxPaletteMockup.box.on('dragmove', (e) => {
//   // console.log('dragging');
//   // boxPaletteMockup.box.move(e.detail.p.x - 100, e.detail.p.y - 150);
// });
boxPaletteMockup.box.on('dragend', (e) => {
  console.log('dragging ended');
  if(e.detail.p.x <= $("#palette").width()) {
    delete boxes[boxMockup.box.label];
    boxCounter--;
    boxMockup.box.remove();
  }
  boxMockup.draggable = false;
  boxMockup.box.draggable(false);
  if (boxMockup.tmp.selection) {
    boxMockup.tmp.selection.remove();
  }
  $(boxMockup.box.node).css('cursor', 'auto');
  boxPaletteMockup.box.move(50,50);
  draggingBox = false;
});
singleBoxPaletteMockup.box.on('dragend', (e) => {
  console.log('dragging ended');
  if(e.detail.p.x <= $("#palette").width()) {
    delete boxes[boxMockup.box.label];
    boxCounter--;
    boxMockup.box.remove();
  }
  boxMockup.draggable = false;
  boxMockup.box.draggable(false);
  if (boxMockup.tmp.selection) {
    boxMockup.tmp.selection.remove();
  }
  $(boxMockup.box.node).css('cursor', 'auto');
  singleBoxPaletteMockup.box.move(50,150);
  draggingBox = false;
});

draw.on('mousemove', (e) => {
  console.log('mouseover');
  if (draggingBox) {
    var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 "+$('#drawing').width()+" "+$('#drawing').height()).split(" ");
    var valX = (e.offsetX/$('#drawing').width())*viewBox[2];
    var valY = (e.offsetY/$('#drawing').height())*viewBox[3];
    boxMockup.box.move((valX-100)+parseInt(viewBox[0], 10), valY+parseInt(viewBox[1], 10));
  }
  if (tmpConnect) {
    var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 "+$('#drawing').width()+" "+$('#drawing').height()).split(" ");
    var valX = ((e.offsetX/$('#drawing').width())*viewBox[2]);
    var valY = ((e.offsetY/$('#drawing').height())*viewBox[3]);
    tmpConnect.plot(connecting.source.x()+50,connecting.source.y()+37,valX+parseInt(viewBox[0], 10),valY+parseInt(viewBox[1], 10));
  }

});
draw.on('click', (e) => {
  console.log('draw clicked');
  $(context).hide();
  if (selection && boxes[selection.label]) {
    boxes[selection.label].draggable = false;
    boxes[selection.label].box.draggable(false);
    boxes[selection.label].tmp.selection.remove();
    $(boxes[selection.label].box.node).css('cursor', 'auto');
    boxes[selection.label].tmp.selection.remove();
  } else if (selection) {
    selection.setLineColor("#5D4037");
  }
  cleanConnection();
  $("#contextMenu").hide();
});
draw.on('contextmenu', (e) => {
  e.preventDefault();
  // var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 0 0").split(" ");
  // context.setAttribute('x', e.clientX+parseInt(viewBox[0], 10));
  // context.setAttribute('y', e.clientY+parseInt(viewBox[1], 10));
  // context.setAttribute('width', $('#foreignContent')[0].clientWidth);
  // context.setAttribute('height', $('#foreignContent')[0].clientHeight);
  // $(context).show();

  var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 "+$('#drawing').width()+" "+$('#drawing').height()).split(" ");
  var valX = ((e.offsetX/$('#drawing').width())*viewBox[2])+parseInt(viewBox[0], 10);
  var valY = ((e.offsetY/$('#drawing').height())*viewBox[3])+parseInt(viewBox[1], 10);
  // context.setAttribute('x', valX+parseInt(viewBox[0], 10));
  // context.setAttribute('y', valY+parseInt(viewBox[1], 10));

  $("#contextMenu").show();
  $("#contextMenu").css('left', e.clientX);
  $("#contextMenu").css('top', e.clientY);
  $('#contextCut').hide();
  $('#contextCopy').hide();
  $('#contextPaste').hide();
  if (clipboard) { $('#contextPaste').show(); clipboard.x = valX; clipboard.y = valY; }
  $('#contextDelete').hide();
  $('#contextProperties').hide();

  // addDualValueBox();
  // myBoxes.push(new createBox(nodes, e.clientX+parseInt(viewBox[0], 10), e.clientY+parseInt(viewBox[1], 10)));
});

function cleanConnection() {
  console.log(connecting.source);
  if (boxes[connecting.source.label] && connecting.source) {
    boxes[connecting.source.label].tmp.connection.remove();
    connecting.source = false;
    if (tmpConnect) {
      tmpConnect.remove();
      tmpConnect = false;
    }
  }
  if (boxes[connecting.target.label] && connecting.target) {
    boxes[connecting.target.label].tmp.connection.remove();
    connecting.target = false;
    if (tmpConnect) {
      tmpConnect.remove();
      tmpConnect = false;
    }
  }
}

var selection;
function connectBoxAuto(A, B) {
  var conn = (A.connectable({
    container: links,
    markers: markers,
    // padEllipse: true
  }, B));
  conn.setLineColor("#5D4037");
  // conn.line.stroke({ width: 1 });
  conn.marker.on('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
  });
  conn.line.on('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
  });
}
function connectBox() {
  console.log('connecting -------------');
  // console.log(connecting.source);
  // console.log(connecting.target);
  if (connecting.source.cons) {
    for (var i = 0; i < connecting.source.cons.length; i++) {
      if(connecting.source.cons[i].target.label == connecting.target.label) {
        cleanConnection();
        return;
      }
    }
  }
  if (connecting.source.label == connecting.target.label) {
    cleanConnection();
    return;
  }
  if (connecting.target.cons) {
    for (var i = 0; i < connecting.target.cons.length; i++) {
      if(connecting.target.cons[i].target.label == connecting.source.label) {
        cleanConnection();
        return;
      }
    }
  }
  var conn = (connecting.source.connectable({
    container: links,
    markers: markers,
    // padEllipse: true
  }, connecting.target));
  conn.setLineColor("#5D4037");
  // conn.line.stroke({ width: 1 });
  conn.marker.on('click', (e) => {
    console.log('marker clicked');
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
  });
  conn.line.on('click', (e) => {
    console.log('line clicked');
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
  });
  conn.line.on('contextmenu', (e) => {
    console.log('rightclicked');
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
    $("#contextMenu").show();
    $("#contextMenu").css('left', e.clientX);
    $("#contextMenu").css('top', e.clientY);
    $('#contextCut').hide();
    $('#contextCopy').hide();
    $('#contextPaste').hide();
    $('#contextDelete').show();
    $('#contextProperties').hide();
  });
  conn.marker.on('contextmenu', (e) => {
    console.log('rightclicked');
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selection && boxes[selection.label]) {
      boxes[selection.label].tmp.selection.remove();
    } else if (selection) {
      selection.setLineColor("#5D4037");
    }
    selection = conn;
    conn.setLineColor("#5D4");
    $("#contextMenu").show();
    $("#contextMenu").css('left', e.clientX);
    $("#contextMenu").css('top', e.clientY);
    $('#contextCut').hide();
    $('#contextCopy').hide();
    $('#contextPaste').hide();
    $('#contextDelete').show();
    $('#contextProperties').hide();
  });
  cleanConnection();
}

$('html').keyup(function(e){
  if(e.keyCode == 46 || e.keyCode == 8) {
    if (selection && boxes[selection.label] && permissions.deleteBoxes) {
      if (selection.cons) {
        for (var i = selection.cons.length - 1; i >= 0; i--) {
          selection.cons[i].remove();
        }
      }
      if (selection.sources) {
        for (var i = selection.sources.length - 1; i >= 0; i--) {
          // for (var j = selection.sources[i].source.cons.length - 1; j >= 0; j--) {
          //   if(selection.sources[i].source.cons[j].id == selection.sources[i].id) {
          //     selection.sources[i].source.cons[j].remove();
          //   }
          // }
          selection.sources[i].remove();
        }
      }
      selection.remove();
      cleanConnection();
      delete boxes[selection.label];
      selection = null;
    } else if (selection && permissions.deleteArrows) {
      selection.remove();
      cleanConnection();
    }
  }
});

function createBox(nodes, clientX, clientY, label, formula, vals, type) {


  createBox.prototype.setLabel = function(str) {
    // str = str.replaceAll(" ", "_");
    for (var i = 0; i < this.values.length; i++) {
      parsers[i].setVariable(str, parseFloat(this.values[i].text(), 10));
      delete parsers[i].variables[this.getLabel()];
    }
    delete boxes[this.box.label];
    this.label.text(function(add) {
      add.tspan(str).dy(18).dx(50) // rectangle
      // add.tspan(str).dy(60).dx(90) // circle
    }).font({
      fill: '#fff',
      size: fontsize,
      anchor: 'middle'
    });
    boxes[str] = this;
    this.box.label = str;
  };
  createBox.prototype.getLabel = function(str) {
    // return this.label.text().replaceAll(" ", "_");
    return this.label.text();
  };
  createBox.prototype.setFormat = function(prefix, suffix, seperator, decimals, negative) {
    this.prefix = prefix;
    this.suffix = suffix;
    this.seperator = seperator;
    this.decimals = decimals;
    this.negative = negative;
    this.setValues(this.getFormattedValues());
  };
  createBox.prototype.setValues = function(arr) {
    console.log(arr);
    this.vals = [];
    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] == 'string') {
        arr[i] = arr[i].float(); 
        this.vals[i] = arr[i];
      }
      if (this.values[i]) {
        this.values[i].text((add) => {
          var formattedNumber = arr[i];
          if (this.suffix == '%' && this.formula) { formattedNumber = formattedNumber*100 }
          if (arr[i] < 0 && this.negative) {
            formattedNumber = (formattedNumber - (formattedNumber*2));
          }
          formattedNumber = new String(formattedNumber);
          formattedNumber = Number(formattedNumber).toFixed(this.decimals);
          console.log(this.seperator);
          if (this.seperator) {
            formattedNumber = formattedNumber.replace(new RegExp("\\B(?=(\\d{"+this.seperator+"})+(?!\\d))", 'g'), ",");
          }
          formattedNumber = this.prefix+' '+formattedNumber+' '+this.suffix
          if (arr[i] < 0 && this.negative) {
            formattedNumber = '(' + formattedNumber + ')';
          }
          add.tspan(formattedNumber).dy(42+(i*25)).dx(50) // rectangle
          // add.tspan(arr[i]).dy(120).dx(45+(i*90)) // circle
        }).font({
          size: fontsize,
          anchor: 'middle'
        });
        if (arr[i] < 0 && this.negative) {
          this.values[i].fill("#f00");
        } else {
          this.values[i].fill("#000");
        }
        parsers[i].setVariable(this.getLabel(), parseFloat(arr[i], 10));
      } else {
        // this.tmp.values[i] = this.box.rect(100, 50).move(0, (50+(i*50))).fill("#ffe21f").stroke({ color: '#fff', opacity: 1, width: 3 });
        // this.values[i] = this.box.text(function(add) {
        //   // add.tspan(Math.floor(Math.random()*100)).dy(80).dx(50)
        //   add.tspan((arr[i]) || 0).dy(80+(i*50)).dx(50) // rectangle
        //   // add.tspan(0).dy(120).dx(45) // circle
        // }).font({
        //   anchor: 'middle'
        // })
      }
    }
    // for (var i = 0; i < this.values.length; i++) {
    //   if (arr[i]) { } else {
    //     this.values[i].remove();
    //     this.tmp.values[i].remove();
    //   }
    // }
    if (this.box.cons) {
      for (var j = 0; j < this.box.cons.length; j++) {
        if(boxes[this.box.cons[j].target.label].formula) {
          boxes[this.box.cons[j].target.label].evaluate();
        }
      }
    }
  };
  createBox.prototype.getFormattedValues = function() {
    var values = [];
    for (var i = 0; i < this.values.length; i++) {
      values.push(this.vals[i]);
    }
    return values;
  };
  createBox.prototype.getValues = function() {
    var values = [];
    for (var i = 0; i < this.values.length; i++) {
      values.push(this.values[i].text());
    }
    return values;
  };
  createBox.prototype.setFormula = function(formula) {
    // this.formula = formula.replaceAll(" ", "_");
    this.formula = formula;
    this.evaluate();
  }
  createBox.prototype.evaluate = function() {
    var formula = this.formula;
    if (formula) {
      var values = this.getFormattedValues();
      for (var i = 0; i < this.values.length; i++) {
        values[i] = (parsers[i].parse(formula)).result || 0;
      }
      this.setValues(values);
    }
  }
  createBox.prototype.setColor = function(color) {
    this.color = color;
    this.tmp.label.fill(color);
  };
  createBox.prototype.getColor = function(color) {
    return this.color;
  };

  this.destinations = [];
  if (permissions.dragBoxes && type == 'mockup') {
      this.box = nodes.group().translate(clientX, clientY).draggable();
  } else {
    this.box = nodes.group().translate(clientX, clientY);
    this.draggable = false;
  }
  this.id = (this.box.node.id);
  if (type != 'mockup') {
    this.tmp = {
      label: this.box.rect(100, 25).fill("rgb(3,101,192)").stroke({ color: '#fff', opacity: 1, width: 1 }),
      values: []
    }
  } else {
    this.tmp = {
      label: this.box.rect(100, 25).fill("rgb(3,101,192)").stroke({ color: '#fff', opacity: 1, width: 1 }),
      values: []
    }
  }
  // this.box.rect(100, 150).move(40, 15).fill("#ccc");
  // this.box.circle(180).fill("rgba(0,0,0,0.2)");
  // this.box.circle(180).fill("#ccc");
  this.label = this.box.text(function(add) {
    add.tspan(label).dy(18).dx(50) // rectangle
    // add.tspan('BOX_'+boxCounter).dy(30).dx(50) // rectangle // default
    // add.tspan('BOX_'+boxCounter).dy(60).dx(90) // circle
  }).font({
    fill: '#fff',
    size: fontsize,
    anchor: 'middle'
  });
  this.values = [];
  this.vals = [];
  for (var i = 0; i < vals.length; i++) {
    if (type != 'mockup') {
      this.tmp.values.push(this.box.rect(100, 25).move(0, (25+(i*25))).fill("rgb(220,220,220)").stroke({ color: '#fff', opacity: 1, width: 1 }));
    } else {
      this.tmp.values.push(this.box.rect(100, 25).move(0, (25+(i*25))).fill("rgb(220,220,220)").stroke({ color: '#fff', opacity: 1, width: 1 }));
    }
    // this.box.rect(100, 50).move(0, 100).fill("#ffe21f").stroke({ color: '#fff', opacity: 1, width: 3 });
    this.vals.push(vals[i]);
    this.values.push(this.box.text(function(add) {
      // add.tspan(Math.floor(Math.random()*100)).dy(80).dx(50)
      add.tspan((vals[i]) || 0).dy(42+(i*25)).dx(50) // rectangle
      // add.tspan(0).dy(120).dx(45) // circle
    }).font({
      size: fontsize,
      anchor: 'middle'
    }));
  }
  // this.values = [this.box.text(function(add) {
  //   // add.tspan(Math.floor(Math.random()*100)).dy(80).dx(50)
  //   add.tspan((vals[0]) || 0).dy(80).dx(50) // rectangle
  //   // add.tspan(0).dy(120).dx(45) // circle
  // }).font({
  //   anchor: 'middle'
  // }), this.box.text(function(add) {
  //   // add.tspan(Math.floor(Math.random()*100)).dy(130).dx(50)
  //   add.tspan((vals[1]) || 0).dy(130).dx(50) // rectangle
  //   // add.tspan(0).dy(120).dx(135) // circle
  // }).font({
  //   anchor: 'middle'
  // })];
  for (var i = 0; i < this.values.length; i++) {
    parsers[i].setVariable(label, vals[i]);
    // parsers[i].setVariable('BOX_'+boxCounter, 0);
  }
  this.formula = formula;
  if (formula) { this.evaluate(); }
  if (type != 'mockup') {
    this.box.on('mouseenter', (e)=> {
      console.log('mouseenter');
      // e.preventDefault();
      // e.stopImmediatePropagation();
      // if (!connecting.source) {
      //   if (this.tmp.hoverConnection) {this.tmp.hoverConnection.remove();}
      //   this.tmp.hoverConnection = this.box.rect(200, 50+(50*vals.length)).fill('rgba(0,0,0,0)').stroke({ color: '#ff851b', opacity: 0.5, width: 3 });
      // } else {
      //   if (this.tmp.hoverConnection) {this.tmp.hoverConnection.remove();}
      //   this.tmp.hoverConnection = this.box.rect(200, 50+(50*vals.length)).fill('rgba(0,0,0,0)').stroke({ color: '#ff695e', opacity: 0.5, width: 3 });
      // }
      // if (this.tmp.arrow) { this.tmp.arrow.remove(); }
      // this.tmp.arrow = this.box.image('/arrow.png', 30, 30).move(160, 10);
    });
    var dragged = [0,0];
    this.box.on('mouseleave', (e)=> {
      e.preventDefault();
      e.stopImmediatePropagation();
      // if (!connecting.source) {
      //   this.tmp.hoverConnection.remove();
      // } else {
      //   this.tmp.hoverConnection.remove();
      // }
      if (dragged[0] == this.box.x() && dragged[1] == this.box.y()) {

      } else {
        // cleanConnection();
      }
      if (this.tmp.arrow) { this.tmp.arrow.remove(); }
    });
    this.box.on('dragstart', (e) => {
      console.log('dragstart');
      dragged = [this.box.x(), this.box.y()];
      // if (this.tmp.arrow) { this.tmp.arrow.remove(); }
    });
    this.box.on('dragend', (e) => {
      console.log('dragend');
      this.draggable = false;
      this.box.draggable(false);
      $(this.box.node).css('cursor', 'auto');
      if (this.tmp.selection) { this.tmp.selection.remove(); }
      // if (this.tmp.arrow) { this.tmp.arrow.remove(); }
    });
    var isLongClick = false; var longClickTimer = 0;
    this.box.on('mousedown', (e) => {
      if (!this.draggable) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        if (!connecting.source) {
          console.log('connection source inited');
          connecting.source = this.box;
          if (this.tmp.connection) {this.tmp.connection.remove();}
          this.tmp.connection = this.box.rect(100, 25+(25*this.getValues().length)).fill('rgba(0,0,0,0)').stroke({ color: '#ff851b', opacity: 0.5, width: 3 });
          tmpConnect = draw.line(this.box.x(),this.box.y(),this.box.x(),this.box.y()).stroke({ width: 2 }).back();
          // this.tmp.arrow.remove();
        } else {
          // connecting.target = this.box;
          // if (this.tmp.connection) {this.tmp.connection.remove();}
          // this.tmp.connection = this.box.rect(200, 150).fill('rgba(0,0,0,0)').stroke({ color: '#ff695e', opacity: 0.5, width: 3 });
          // connectBox();
        }
      }
      longClickTimer = Date.now();
    });
    var click = 0;
    this.box.on('mouseup', (e) => {
      $("#contextMenu").hide();
      console.log('mouseup');
      console.log('draggable: '+this.draggable);
      if (!this.draggable) {
        if (selection && boxes[selection.label]) { 
          boxes[selection.label].draggable = false;
          boxes[selection.label].box.draggable(false);
          boxes[selection.label].tmp.selection.remove();
          $(boxes[selection.label].box.node).css('cursor', 'auto');
        }
        else if (selection) { selection.setLineColor("#5D4037"); }
        this.draggable = true;
        this.box.draggable();
        $(this.box.node).css('cursor', 'move');
        selection = this.box;
        this.tmp.selection = this.box.rect(100, 25+(25*this.getValues().length)).fill('rgba(0,0,0,0.5)').stroke({ color: '#0f0', opacity: 0.5, width: 3 });
      } else {
        this.draggable = false;
        this.box.draggable(false);
        $(this.box.node).css('cursor', 'auto');
      }
      click++;
      if(click == 2) {
        if (selection && boxes[selection.label]) {
          boxes[selection.label].draggable = false;
          boxes[selection.label].box.draggable(false);
          boxes[selection.label].tmp.selection.remove();
          $(boxes[selection.label].box.node).css('cursor', 'auto');
          selection = false;
        }
        else if (selection) { selection = false; selection.setLineColor("#5D4037"); }
        showEditBoxForm(this.box);
      }
      setTimeout(()=>{ click = 0; }, 300);
      if (!connecting.source) {
        // this.tmp.arrow.remove();
        // if (Date.now() > longClickTimer+500) {
        //   console.log('longClicked');
        //   connecting.source = this.box;
        //   if (this.tmp.connection) {this.tmp.connection.remove();}
        //   this.tmp.connection = this.box.rect(200, 150).fill('rgba(0,0,0,0)').stroke({ color: '#ff851b', opacity: 0.5, width: 3 });
        //   tmpConnect = draw.line(this.box.x(),this.box.y(),this.box.x(),this.box.y()).stroke({ width: 2 }).back();
        // }
      } else {
        connecting.target = this.box;
        if (this.tmp.connection) {this.tmp.connection.remove();}
        this.tmp.connection = this.box.rect(100, 25+(25*this.getValues().length)).fill('rgba(0,0,0,0)').stroke({ color: '#ff695e', opacity: 0.5, width: 3 });
        connectBox();
      }
    });
    // this.box.on('click', (e) => {
    //   console.log('clicked');
    //   e.preventDefault();
    //   e.stopImmediatePropagation();
    //   if (e.target.instance.type=='image') {
    //     console.log(connecting);
    //     if (!connecting.source) {
    //       console.log('connection source inited');
    //       connecting.source = this.box;
    //       if (this.tmp.connection) {this.tmp.connection.remove();}
    //       this.tmp.connection = this.box.rect(200, 150).fill('rgba(0,0,0,0)').stroke({ color: '#ff851b', opacity: 0.5, width: 3 });
    //       tmpConnect = draw.line(this.box.x(),this.box.y(),this.box.x(),this.box.y()).stroke({ width: 2 }).back();
    //       this.tmp.arrow.remove();
    //     } else {
    //       // connecting.target = this.box;
    //       // if (this.tmp.connection) {this.tmp.connection.remove();}
    //       // this.tmp.connection = this.box.rect(200, 150).fill('rgba(0,0,0,0)').stroke({ color: '#ff695e', opacity: 0.5, width: 3 });
    //       // connectBox();
    //     }
    //   } else {
    //   }
    //   if (selection && boxes[selection.label]) { boxes[selection.label].tmp.selection.remove(); }
    //   else if (selection) { selection.setLineColor("#5D4037"); }
    //   // selection = this.box;
    //   // this.tmp.selection = this.box.rect(200, 150).fill('rgba(0,0,0,0.5)').stroke({ color: '#0f0', opacity: 0.5, width: 3 });
    // });
    this.box.on('contextmenu', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      // open popup for that box
      // showEditBoxForm(this.box);
      // this.setLabel(prompt('label ?', this.getLabel()) || this.getLabel());
      // if (confirm('press OK to put values or Cancel to use formula ?')) {
      //   var values = this.getValues();
      //   this.setValues([(prompt('value 1 ?', values[0]) || 0), (prompt('value 2 ?', values[1]) || 0)]); 
      // } else {
      //   this.setFormula(prompt('formula ?', this.formula));
      // }

      // var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 "+$('#drawing').width()+" "+$('#drawing').height()).split(" ");
      // var valX = (e.offsetX/$('#drawing').width())*viewBox[2];
      // var valY = (e.offsetY/$('#drawing').height())*viewBox[3];
      // context.setAttribute('x', valX+parseInt(viewBox[0], 10));
      // context.setAttribute('y', valY+parseInt(viewBox[1], 10));
      // context.setAttribute('width', $('#foreignContent')[0].clientWidth);
      // context.setAttribute('height', $('#foreignContent')[0].clientHeight);
      // $(context).show();

      $("#contextMenu").show();
      $('#contextCut').show();
      $('#contextCopy').show();
      $('#contextPaste').hide();
      $('#contextDelete').show();
      $('#contextProperties').show();
      $("#contextMenu").css('top', e.clientY);
      $("#contextMenu").css('left', e.clientX);
      console.log(e);

      // addDualValueBox();
      // myBoxes.push(new createBox(nodes, e.clientX+parseInt(viewBox[0], 10), e.clientY+parseInt(viewBox[1], 10)));
    });
  }
  this.box.label = label;
  boxes[label] = this;
  boxCounter++;
  return this;
}

Mousetrap.bind(['command+x', 'ctrl+x'], function(e) {
  if (selection) {
    cutSelection();
  }
});

Mousetrap.bind(['command+c', 'ctrl+c'], function(e) {
  if (selection) {
    copySelection();
  }
});

Mousetrap.bind(['command+v', 'ctrl+v'], function(e) {
  if (clipboard) {
    pasteSelection();
  }
});

var clipboard = false;
function cutSelection() {
  $("#contextMenu").hide();
  clipboard = {
    formula: boxes[selection.label].formula,
    label: boxes[selection.label].getLabel(),
    values: boxes[selection.label].getFormattedValues(),
    color: boxes[selection.label].getColor(),
    prefix: boxes[selection.label].prefix,
    suffix: boxes[selection.label].suffix,
    seperator: boxes[selection.label].seperator,
    decimals: boxes[selection.label].decimals,
    negative: boxes[selection.label].negative,
    event: 'cut',
    x: 200,
    y: 200
  };
  deleteSelection();
}
function copySelection() {
  $("#contextMenu").hide();
  clipboard = {
    formula: boxes[selection.label].formula,
    label: boxes[selection.label].getLabel(),
    values: boxes[selection.label].getFormattedValues(),
    color: boxes[selection.label].getColor(),
    prefix: boxes[selection.label].prefix,
    suffix: boxes[selection.label].suffix,
    seperator: boxes[selection.label].seperator,
    decimals: boxes[selection.label].decimals,
    negative: boxes[selection.label].negative,
    event: 'copy',
    x: 200,
    y: 200
  };
}
function showPropertiesSelection() {
  $("#contextMenu").hide();
  showEditBoxForm(selection);
}
function pasteSelection(e) {
  $("#contextMenu").hide();
  // var viewBox = ($("#drawing > svg").attr('viewBox') || "0 0 "+$('#drawing').width()+" "+$('#drawing').height()).split(" ");
  // var valX = (e.offsetX/$('#drawing').width())*viewBox[2];
  // var valY = (e.offsetY/$('#drawing').height())*viewBox[3];
  // context.setAttribute('x', valX+parseInt(viewBox[0], 10));
  // context.setAttribute('y', valY+parseInt(viewBox[1], 10));
  console.log(clipboard.x);
  console.log(clipboard.y);
  var newBox = new createBox(nodes, clipboard.x, clipboard.y, 'Var_'+boxCounter, clipboard.formula, clipboard.values);
  myBoxes.push(newBox);
  newBox.setColor(clipboard.color);
  newBox.setFormat((clipboard.prefix || ''), (clipboard.suffix || ''), (clipboard.seperator || ''), (clipboard.decimals || ''), (clipboard.negative || ''));
  if (clipboard.event == 'cut') { clipboard = false; }
}
function deleteSelection() {
  $("#contextMenu").hide();
  if (selection && boxes[selection.label] && permissions.deleteBoxes) {
    if (selection.cons) {
      for (var i = selection.cons.length - 1; i >= 0; i--) {
        selection.cons[i].remove();
      }
    }
    if (selection.sources) {
      for (var i = selection.sources.length - 1; i >= 0; i--) {
        // for (var j = selection.sources[i].source.cons.length - 1; j >= 0; j--) {
        //   if(selection.sources[i].source.cons[j].id == selection.sources[i].id) {
        //     selection.sources[i].source.cons[j].remove();
        //   }
        // }
        selection.sources[i].remove();
      }
    }
    selection.remove();
    cleanConnection();
    delete boxes[selection.label];
    selection = null;
  } else if (selection && permissions.deleteArrows) {
    selection.remove();
    cleanConnection();
  }
}

function createContextElement() {
  var foreign = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
  foreign.style.display = 'none';
  $(foreign).html(`<div id="foreignContent"><div class="ui vertical menu" id="t">
    <a class="item" onclick="addDualValueBox()">
      2 Values Box
    </a>
    <a class="item" onclick="addSingleValueBox()">
      Single Value Box
    </a>
  </div></div>`);
  $('#SvgjsSvg1001').append(foreign);
  foreign.setAttribute('x', 0);
  foreign.setAttribute('y', 0);
  foreign.setAttribute('width', window.innerWidth);
  foreign.setAttribute('height', window.innerHeight);
  return foreign;
}

function changeContextContent() {
  $(context).html(content);
  foreign.setAttribute('x', 0);
  foreign.setAttribute('y', 0);
  foreign.setAttribute('width', window.innerWidth);
  foreign.setAttribute('height', window.innerHeight);
}

function addDualValueBox() {
  $('.ui.newbox.modal').modal('show');
  $('#newBoxForm')[0].reset();
  $('#newBoxForm').find('.values').attr('disabled', false);
  $('#newBoxForm').find('.formula').attr('disabled', false);
}

function addSingleValueBox() {
  $('.ui.newbox_single.modal').modal('show');
  $('#newBoxSingleForm')[0].reset();
  $('#newBoxSingleForm').find('.values').attr('disabled', false);
  $('#newBoxSingleForm').find('.formula').attr('disabled', false);
}

function addNewBox() {
  var form = $('#newBoxForm')[0];
  var label = (form.label.value);
  if (boxes[label]) { return alert('box already exists with this label'); }
  // var haveFormula = (form.haveFormula.value);
  // var haveValues = (form.haveValues.value);
  var formula = (form.formula.value);
  var values = [];
  if (formula) {

  } else {
    var val1 = (form.val1.value);
    var val2 = (form.val2.value);
    if (val1 || true) { values.push(val1); }
    if (val2 || true) { values.push(val2); }
    formula = null;
  }
  myBoxes.push(new createBox(nodes, parseInt(context.getAttribute('x'), 10), parseInt(context.getAttribute('y'), 10), label, formula, values));
  $('.ui.modal').modal('hide');
}

function addNewBoxSingle() {
  var form = $('#newBoxSingleForm')[0];
  var label = (form.label.value);
  if (boxes[label]) { return alert('box already exists with this label'); }
  // var haveFormula = (form.haveFormula.value);
  // var haveValues = (form.haveValues.value);
  var formula = (form.formula.value);
  var values = [];
  if (formula) {

  } else {
    var val1 = (form.val1.value);
    if (val1 || true) { values.push(val1); }
    formula = null;
  }
  myBoxes.push(new createBox(nodes, parseInt(context.getAttribute('x'), 10), parseInt(context.getAttribute('y'), 10), label, formula, values));
  $('.ui.modal').modal('hide');
}

window.editingBox = new Object();
function showEditBoxForm(box) {
  var form = $('#editBoxForm')[0];
  if (!permissions.changeValue) {
    $(form.val1).attr('disabled', true);
    $(form.val2).attr('disabled', true);
  }
  if (!permissions.changeFormula) {
    $(form.formula).attr('disabled', true);
  }
  if (!permissions.changeLabel) {
    $(form.label).attr('disabled', true);
  }
  if (!permissions.changeValue && !permissions.changeFormula && !permissions.changeLabel) {
    return;
  }
  $(form.val2).parent().show();
  box = boxes[box.label];
  editingBox = box;
  var label = (form.label.value) = box.getLabel();
  var values = box.getFormattedValues();
  // if (box.formula) {
    // var haveFormula = (form.haveFormula.value) = true;
    var formula = (form.formula.value) = box.formula;
  // } else {
    // var haveFormula = (form.haveFormula.value) = false;
    // var formula = (form.formula.value) = "";
    // (form.val1.value) = "";
    if (box.values[0]) {
      var val1 = (form.val1.value) = values[0];
    }
    // (form.val2.value) = "";
    if (!box.values[1]) {
      $(form.val2).parent().hide();
      var val2 = (form.val2.value) = "";
    } else {
      var val2 = (form.val2.value) = values[1]; 
    }
  // }
  // var haveValues = (form.haveValues.value) = true;
  $('.ui.modal.editbox').modal('show');
}

function editBox() {
  var form = $('#editBoxForm')[0];
  var label = (form.label.value);
  var color = (form.color.value);
  // var haveFormula = (form.haveFormula.value);
  // var haveValues = (form.haveValues.value);
  var formula = (form.formula.value);
  var val1 = (form.val1.value);
  var val2 = (form.val2.value);
  var prefix = (form.prefix.value);
  var suffix = (form.suffix.value);
  var seperator = false;
  if(form.seperator.checked) {
    seperator = 3;
  }
  var decimals = (form.decimals.value);
  var negative = form.negative.checked;
  // if (!haveFormula) { formula = null };
  editingBox.setLabel(label);
  editingBox.setColor(color);
  editingBox.setFormat(prefix,suffix,seperator,decimals,negative);
  if (formula || editingBox.formula) {
    editingBox.setFormula(formula);
  } else {
    editingBox.setValues([val1, val2]);
  }
  $('.ui.modal').modal('hide');
}

// $('.formula').bind('input', function(){
//   if(this.value) {
//     $(this).parents('form').find('.values').attr('disabled', true);
//   } else {
//     $(this).parents('form').find('.values').attr('disabled', false);
//   }
// });

// $('.values').bind('input', function(){
//   if(this.value) {
//     $(this).parents('form').find('.formula').attr('disabled', true);
//   } else {
//     $(this).parents('form').find('.formula').attr('disabled', false);
//   }
// });

function saveCanvas(form){
  var title = (form.title.value);
  var permissions = {
    dragBoxes: (form.dragBoxes.checked),
    changeValue: (form.changeValue.checked),
    changeFormula: (form.changeFormula.checked),
    changeLabel: (form.changeLabel.checked),
    deleteBoxes: (form.deleteBoxes.checked),
    deleteArrows: (form.deleteArrows.checked)
  };
  if (!title) { alert('please add title'); return false; }
  if (!boxes.count()) { alert('please add some boxes'); return false; }
  boxes.save(title, permissions, function(id) {
    $('#shareableLink').attr('href', location.href+"#/"+id);
    $('#shareableLink').html(location.href+"#/"+id);
    $('.ui.share.modal').modal('show');
  });
  return false;
}