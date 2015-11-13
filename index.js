var net = require('net');
var Color = require('color');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerAccessory("homebridge-hyperion", "Hyperion", HyperionAccessory);
}

function HyperionAccessory(log, config) {
  this.log = log;
  this.host = config["host"];
  this.port = config["port"];
  this.name = config["name"];
  this.color = Color().hsv([0, 0, 0]);
  this.prevColor = Color().hsv([0,0,100]);
  this.log("Starting Hyperion Accessory");

  this.service = new Service.Lightbulb(this.name);
  
  this.service
    .getCharacteristic(Characteristic.On)
    .on('set', this.setPowerState.bind(this));

  this.service
    .getCharacteristic(Characteristic.Brightness)
    .on('set', this.setBrightness.bind(this));

  this.service
    .getCharacteristic(Characteristic.Hue)
    .on('set', this.setHue.bind(this));

  this.service
    .getCharacteristic(Characteristic.Saturation)
    .on('set', this.setSaturation.bind(this));

}

HyperionAccessory.prototype.sendHyperionCommand = function(command, cmdParams, callback) {
    var client = new net.Socket();
    var data = {};
    var that = this;

    switch (command) {
        case 'color':
            data = {"command":"color", "priority":100,"color":cmdParams}; 
            break;
        case 'blacklevel':
            data = {"command":"transform","transform":{"blacklevel":cmdParams}}
            break;
    }

    client.connect(that.port, that.host, function() {
        client.write(JSON.stringify(data) + "\n");
    });

    client.on('data', function(data){
        //that.log("Response: " + data.toString().trim());
        //that.log("***** Color HSV:" + that.color.hsvArray() + "*****");
        //that.log("***** Color RGB:" + that.color.rgbArray() + "*****");
        var out = JSON.parse(data.toString().trim());
        client.end();
        callback(out.success);
    });
}

HyperionAccessory.prototype.setPowerState = function(powerOn, callback) {
    if (powerOn) {
        this.log("Setting power state on the '"+this.name+"' to on");
        this.color.rgb(this.prevColor.rgb());
        this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
            callback(result);
        }.bind(this));
    } else {
        this.log("Setting power state on the '"+this.name+"' to off");
        this.prevColor.rgb(this.color.rgb());
        this.color.value(0);
        this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
            callback(result);
        }.bind(this));
        this.sendHyperionCommand('blacklevel', [0,0,0], function(result) {
        }.bind(this));
    }
}

HyperionAccessory.prototype.setBrightness = function(level, callback) {
    this.color.value(level);
    this.log("Setting brightness on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        callback(result);
    }.bind(this));
}

HyperionAccessory.prototype.setHue = function(level, callback) {
    this.color.hue(level);
    this.prevColor.hue(level);
    this.log("Setting hue on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        callback(result);
    }.bind(this));
}

HyperionAccessory.prototype.setSaturation = function(level, callback) {
    this.color.saturationv(level);
    this.prevColor.saturationv(level);
    this.log("Setting saturation on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        callback(result);
    }.bind(this));
}

HyperionAccessory.prototype.getServices = function() {
    return [this.service];
}
