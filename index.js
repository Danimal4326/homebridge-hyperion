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
    this.log        = log;
    this.host       = config["host"];
    this.port       = config["port"];
    this.name       = config["name"];
    this.ambi_name  = config["ambilight_name"];
    this.priority   = config["priority"];
    this.color      = Color().hsv([0, 0, 0]);
    this.prevColor  = Color().hsv([0, 0, 100]);
    this.powerState = 0;
    this.ambiState  = 0;
    this.log("Starting Hyperion Accessory");
}

HyperionAccessory.prototype.sendHyperionCommand = function(command, color, callback) {
    var client = new net.Socket();
    var commands = [];
    var that = this;

    switch (command) {
        case 'powerMode':
            commands.push( {
                command: "clearall"
            });
            commands.push( {
                command: "color",
                priority: that.priority,
                color: color.rgbArray()
            });
            commands.push( {
                command: "transform",
                transform: {
                    blacklevel: [0,0,0],
                    whitelevel: [1,1,1]
                }
            });
            break;
         case 'color':
            commands.push( {
                command: "color",
                priority: that.priority,
                color: color.rgbArray()
            });
            break;
         case 'clearall':
            commands.push( {
                command: "clearall"
            });
            break;
    }

    client.connect(that.port, that.host, function() {
        while (commands.length){
            var current_command = commands.shift();
            client.write(JSON.stringify(current_command) + "\n");
        }
        client.end();
        that.log("Current Color(RGB): " + color.rgbArray());
        callback(null, color);
    });
    
    client.on('error', function(err){
        that.log("Could not send command '" + command + "' with color '" + color.rgbArray() + "'");
        callback(err, that.prevColor);
    });
}

HyperionAccessory.prototype.setPowerState = function(powerOn, callback) {
    var color_to_set;

    if (powerOn) {
        this.log("Setting power state on the '"+this.name+"' to on");
        color_to_set = this.prevColor;
    } else {
        this.log("Setting power state on the '"+this.name+"' to off");
        color_to_set = Color().value(0);
    }
    this.sendHyperionCommand('powerMode', color_to_set, function(err, new_color) {
        if (!err) {
            this.powerState = (new_color.value() > 0)? 1 : 0;
            this.ambiState  = 0;
            this.log("ambi state" + this.ambiState);
            this.color.rgb(new_color.rgb());
        }
        callback(err, this.powerState);
    }.bind(this));
}

HyperionAccessory.prototype.setBrightness = function(level, callback) {
    this.log("Setting brightness on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', Color(this.color).value(level), function(err, new_color) {
        if (!err) {
            if (new_color.value() ==  0 ) {
                this.powerState = 0;
            } else {
                this.powerState = 1;
                this.ambiState  = 0;
            this.log("ambi state" + this.ambiState);
                this.prevColor.value(new_color.value());
            }
            this.color.value(new_color.value());
        }
        callback(err, this.color.value());
    }.bind(this));
}

HyperionAccessory.prototype.setHue = function(level, callback) {
    this.log("Setting hue on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', Color(this.color).hue(level), function(err, new_color) {
        if (!err) {
            this.color.hue(new_color.hue());
            this.prevColor.hue(new_color.hue());
        }
        callback(err, this.color.hue());
    }.bind(this));
}

HyperionAccessory.prototype.setSaturation = function(level, callback) {
    this.log("Setting saturation on the '"+this.name+"' to '" + level + "'");
    this.sendHyperionCommand('color', Color(this.color).saturationv(level), function(err, new_color) {
        if (!err) {
            this.color.saturationv(new_color.saturationv());
            this.prevColor.saturationv(new_color.saturationv());
        }
        callback(err, this.color.saturationv());
    }.bind(this));
}

HyperionAccessory.prototype.identify = function(callback) {
    this.log("Identify");

    this.sendHyperionCommand('powerMode', Color().value(0), function(err, new_color) {});

    setTimeout( function() {
        this.sendHyperionCommand('powerMode', Color().value(100), function(err, new_color) {});
    }.bind(this), 500);
    setTimeout( function() {
        this.sendHyperionCommand('powerMode', Color().value(0), function(err, new_color) {});
    }.bind(this), 1000);
    setTimeout( function() {
        this.sendHyperionCommand('powerMode', Color().value(100), function(err, new_color) {});
    }.bind(this), 1500);
    setTimeout( function() {
        this.sendHyperionCommand('powerMode', Color().value(0), function(err, new_color) {});
    }.bind(this), 2000);
    setTimeout( function() {
        this.sendHyperionCommand('color', this.color, function(err, result) {callback(err, true)});
    }.bind(this), 2500);
}

HyperionAccessory.prototype.getServices = function() {

    var availableServices = [];

    var lightbulbService = new Service.Lightbulb(this.name);
    availableServices.push(lightbulbService);

    lightbulbService
        .getCharacteristic(Characteristic.On)
        .on('get', function(callback) { callback(null, this.powerState); }.bind(this))
        .on('set', this.setPowerState.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Brightness)
        .on('get', function(callback) { callback(null, this.prevColor.value()); }.bind(this))
        .on('set', this.setBrightness.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Hue)
        .on('get', function(callback) { callback(null, this.prevColor.hue()); }.bind(this))
        .on('set', this.setHue.bind(this));

    lightbulbService
        .addCharacteristic(Characteristic.Saturation)
        .on('get', function(callback) { callback(null, this.prevColor.saturationv()); }.bind(this))
        .on('set', this.setSaturation.bind(this));
 

    if (this.ambi_name) {
        var switchService = new Service.Switch(this.ambi_name);
        availableServices.push(switchService);
        
        var command;

        switchService
            .getCharacteristic(Characteristic.On)
            .on('get', function(callback) { callback(null, this.ambiState); }.bind(this))
            .on('set', function(powerState, callback) {
                if (powerState) {
                    command = 'clearall'; 
                } else {
                    command = 'powerMode'; 
                }
                this.sendHyperionCommand(command, Color().value(0), function(err, new_color) {
                    if (!err) {
                        this.ambiState = powerState;
            this.log("ambi state" + this.ambiState);
                        this.powerState = 0;
                        this.color.value(0);
                    }
                    callback(err, this.ambiState) }.bind(this)
                    );
            }.bind(this));

    }

    var informationService = new Service.AccessoryInformation();
    availableServices.push(informationService);

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Hyperion")
        .setCharacteristic(Characteristic.Model, this.host)
        .setCharacteristic(Characteristic.SerialNumber, lightbulbService.UUID);

    return availableServices;
}

