var divA       = document.querySelector("#a");
var divB       = document.querySelector("#b");
var arrowLeft  = document.querySelector("#arrowLeft");
var arrowRight = document.querySelector("#arrowRight");

var drawConnector = function(source, destination) {
  var posnALeft = {
    x: source.offsetLeft + source.offsetWidth / 2,
    y: source.offsetTop  + source.offsetHeight / 2
  };
  // var posnARight = {
  //   x: source.offsetLeft + source.offsetWidth + 8,
  //   y: source.offsetTop  + source.offsetHeight / 2    
  // };
  var posnBLeft = {
    x: destination.offsetLeft + destination.offsetWidth / 2,
    y: destination.offsetTop  + destination.offsetHeight / 2
  };
  // var posnBRight = {
  //   x: destination.offsetLeft + destination.offsetWidth + 8,
  //   y: destination.offsetTop  + destination.offsetHeight / 2
  // };
  var dStrLeft =
      "M" +
      (posnALeft.x      ) + "," + (posnALeft.y) + " " +
      "C" +
      (posnALeft.x) + "," + (posnALeft.y) + " " +
      (posnBLeft.x) + "," + (posnBLeft.y) + " " +
      (posnBLeft.x      ) + "," + (posnBLeft.y);
  arrowLeft.setAttribute("d", dStrLeft);
  // var dStrRight =
  //     "M" +
  //     (posnBRight.x      ) + "," + (posnBRight.y) + " " +
  //     "C" +
  //     (posnBRight.x + 100) + "," + (posnBRight.y) + " " +
  //     (posnARight.x + 100) + "," + (posnARight.y) + " " +
  //     (posnARight.x      ) + "," + (posnARight.y);
  // arrowRight.setAttribute("d", dStrRight);
};

$("#a, #b").draggable({
  drag: function(event, ui) {
    drawConnector(divA, divB);
  }
});

drawConnector(divA, divB);