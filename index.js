var net = require('net');
var Color = require('color');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
  
    homebridge.registerAccessory("homebridge-hyperion", "Hyperion", HyperionAccessory);
}

function HyperionAccessory(log, config) {
    this.log = log;
    this.host = config["host"];
    this.port = config["port"];
    this.name = config["name"];
    this.color = Color().hsv([0, 0, 0]);
    this.prevColor = Color().hsv([0,0,100]);
    this.powerState = false;
    this.log("Starting Hyperion Accessory");
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
            if(result == false) {
                callback(Error("Error setting power state"));
            } else {
                this.powerState = true;
                callback(null, powerOn);
            }
        }.bind(this));
    } else {
        this.log("Setting power state on the '"+this.name+"' to off");
        this.prevColor.rgb(this.color.rgb());
        this.color.value(0);
        this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
            if(!result) {
                callback(Error("Error setting power state"));
            } else {
                this.sendHyperionCommand('blacklevel', [0,0,0], function(result) {
                    if(result == false) {
                        callback(Error("Error setting power state"));
                    } else {
                        this.powerState = false;
                        callback(null, powerOn);
                    }
                }.bind(this));
            }
        }.bind(this));
    }
}

HyperionAccessory.prototype.setBrightness = function(level, callback) {
    this.color.value(level);
    this.log("Setting brightness on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        if (level ==  0 ) {
            this.powerState = false;
        } else {
            this.powerState = true;
        }
        callback(null, this.color.value());
    }.bind(this));
}

HyperionAccessory.prototype.setHue = function(level, callback) {
    this.color.hue(level);
    this.prevColor.hue(level);
    this.log("Setting hue on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        this.powerState = true;
        callback(null, this.color.hue());
    }.bind(this));
}

HyperionAccessory.prototype.setSaturation = function(level, callback) {
    this.color.saturationv(level);
    this.prevColor.saturationv(level);
    this.log("Setting saturation on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', this.color.rgbArray(), function(result) {
        this.powerState = true;
        callback(null, this.color.saturationv());
    }.bind(this));
}

HyperionAccessory.prototype.identify = function(callback) {
    this.log("IDENTIFY");
    this.setPowerState(true, function(){});

    setTimeout( function() {
        this.setPowerState(false,  function(err, result) {});
    }.bind(this), 500);
    setTimeout( function() {
        this.setPowerState(true,  function(err, result) {});
    }.bind(this), 1000);
    setTimeout( function() {
        this.setPowerState(false,  function(err, result) {});
    }.bind(this), 1500);
    callback(null);
}

HyperionAccessory.prototype.getServices = function() {

   var lightbulbService = new Service.Lightbulb(this.name);

    lightbulbService
        .getCharacteristic(Characteristic.On)
        .on('get', function(callback) { callback(null, this.powerState); }.bind(this))
        .on('set', this.setPowerState.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Brightness)
        .on('get', function(callback) { callback(null, this.color.value()); }.bind(this))
        .on('set', this.setBrightness.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Hue)
        .on('get', function(callback) { callback(null, this.color.hue()); }.bind(this))
        .on('set', this.setHue.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Saturation)
        .on('get', function(callback) { callback(null, this.color.saturationv()); }.bind(this))
        .on('set', this.setSaturation.bind(this));

    var informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Hyperion")
        .setCharacteristic(Characteristic.Model, this.host)
        .setCharacteristic(Characteristic.SerialNumber, lightbulbService.UUID);

 
    return [informationService, lightbulbService];
}
