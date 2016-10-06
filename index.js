var net = require('net');
var Color = require('color');
var Service, Characteristic;

module.exports = function (homebridge) {
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
    this.priority   = parseInt(config["priority"]) || 100;
    this.color      = Color().rgb([0, 0, 0]);
    this.prevColor  = Color().rgb([255, 255, 255]);
    this.lightService;
    this.ambiService;
    this.infoService;
    this.log("Starting Hyperion Accessory");
   }

HyperionAccessory.prototype.sendHyperionCommand = function (command, color, callback) {
    var client = new net.Socket();
    var commands = [];

    switch (command) {
        case 'powerMode':
            commands.push({
                command: "clearall"
            });
            commands.push({
                command: "color",
                priority: this.priority,
                color: color.rgbArray()
            });
            commands.push({
                command: "transform",
                transform: {
                    blacklevel: [0, 0, 0],
                    whitelevel: [1, 1, 1]
                }
            });
            break;
        case 'color':
            commands.push({
                command: "color",
                priority: this.priority,
                color: color.rgbArray()
            });
            break;
        case 'ambilight':
            commands.push({
                command: "clearall"
            });
            break;
    }

    client.connect(this.port, this.host, function () {
        while (commands.length) {
            var current_command = commands.shift();
            client.write(JSON.stringify(current_command) + "\n");
        }
        client.end();
        this.log("Current Color(RGB): " + color.rgbArray());
        callback(null, color);
    }.bind(this));

    client.on('error', function (err) {
        this.log("Could not send command '" + command + "' with color '" + color.rgbArray() + "'");
        callback(err, this.prevColor);
    }.bind(this));
}

HyperionAccessory.prototype.setPowerState = function (state, callback) {
    var color_to_set;

    if (state) {
        this.log("Setting power state on the '" + this.name + "' to on");
        color_to_set = this.prevColor;
    } else {
        this.log("Setting power state on the '" + this.name + "' to off");
        color_to_set = Color().value(0);
    }

    this.sendHyperionCommand('powerMode', color_to_set, function (err, new_color) {
        if (!err) {
            if (this.ambi_name && state) {
                this.ambiService.updateCharacteristic(Characteristic.On, 0);
                this.log("Setting ambi state to: " + 0);
            }
            this.color.rgb(new_color.rgb());
            if (state) {
                this.prevColor.rgb(new_color.rgb());
            }
        }
        callback(err, state);
    }.bind(this));
}

HyperionAccessory.prototype.setBrightness = function (level, callback) {
    this.log("Setting brightness on the '" + this.name + "' to '" + level + "'");
    
    this.sendHyperionCommand('color', Color(this.prevColor).value(level), function (err, new_color) {
        if (!err) {
            if (this.ambi_name) {
                this.ambiService.updateCharacteristic(Characteristic.On, 0);
                this.log("Setting ambi state to: " + 0);
            }
            if (level > 0) {
                this.lightService.updateCharacteristic(Characteristic.On, 1);
            }
            this.prevColor.value(new_color.value());
            this.color.value(new_color.value());
        }
        callback(err, this.color.value());
    }.bind(this));
}

HyperionAccessory.prototype.getBrightness = function (callback) {
    callback(null, this.color.value());
}

HyperionAccessory.prototype.setHue = function (level, callback) {
    this.log("Setting hue on the '" + this.name + "' to '" + level + "'");

    this.sendHyperionCommand('color', Color(this.prevColor).hue(level), function (err, new_color) {
        if (!err) {
            this.color.hue(new_color.hue());
            this.prevColor.hue(new_color.hue());
        }
        callback(err, this.color.hue());
    }.bind(this));
}

HyperionAccessory.prototype.getHue = function (callback) {
    callback(null, this.color.hue());
}

HyperionAccessory.prototype.setSaturation = function (level, callback) {
    this.log("Setting saturation on the '" + this.name + "' to '" + level + "'");
    
    this.sendHyperionCommand('color', Color(this.prevColor).saturationv(level), function (err, new_color) {
        if (!err) {
            this.color.saturationv(new_color.saturationv());
            this.prevColor.saturationv(new_color.saturationv());
        }
        callback(err, this.color.saturationv());
    }.bind(this));
}

HyperionAccessory.prototype.getSaturation = function (callback) {
    callback(null, this.color.saturationv());
}

HyperionAccessory.prototype.setAmbiState = function (state, callback) {
    
    var command;

    if (state) {
        command = 'ambilight';
    } else {
        command = 'powerMode';
    }

    this.sendHyperionCommand(command, Color().value(0), function (err, new_color) {
        if (!err) {
            this.log("Setting ambi state to: " + state);
            if (state) {
                this.lightService.updateCharacteristic(Characteristic.On, 0);
                this.log("Setting power state on the '" + this.name + "' to off");
            }
            this.color.value(0);
        }
        callback(err, state)
    }.bind(this));
}

HyperionAccessory.prototype.identify = function (callback) {
    this.log("Identify");

    this.sendHyperionCommand('powerMode', Color().value(0), function (err, new_color) { });

    setTimeout(function () {
        this.sendHyperionCommand('powerMode', Color().value(100), function (err, new_color) { });
    }.bind(this), 500);
    setTimeout(function () {
        this.sendHyperionCommand('powerMode', Color().value(0), function (err, new_color) { });
    }.bind(this), 1000);
    setTimeout(function () {
        this.sendHyperionCommand('powerMode', Color().value(100), function (err, new_color) { });
    }.bind(this), 1500);
    setTimeout(function () {
        this.sendHyperionCommand('powerMode', Color().value(0), function (err, new_color) { });
    }.bind(this), 2000);
    setTimeout(function () {
        this.sendHyperionCommand('color', this.color, function (err, result) { callback(err, true) });
    }.bind(this), 2500);
}

HyperionAccessory.prototype.getServices = function () {

    var availableServices = [];

    this.lightService = new Service.Lightbulb(this.name);
    availableServices.push(this.lightService);

    this.lightService
        .getCharacteristic(Characteristic.On)
        .on('set', this.setPowerState.bind(this));

    this.lightService
        .addCharacteristic(Characteristic.Brightness)
        .on('set', this.setBrightness.bind(this))
        .on('get', this.getBrightness.bind(this))

    this.lightService
        .addCharacteristic(Characteristic.Hue)
        .on('set', this.setHue.bind(this))
        .on('get', this.getHue.bind(this));

    this.lightService
        .addCharacteristic(Characteristic.Saturation)
        .on('set', this.setSaturation.bind(this))
        .on('get', this.getSaturation.bind(this));


    if (this.ambi_name) {
        this.ambiService = new Service.Switch(this.ambi_name);
        
        availableServices.push(this.ambiService);

        this.ambiService
            .getCharacteristic(Characteristic.On)
            .on('set', this.setAmbiState.bind(this));
    }

    this.infoService = new Service.AccessoryInformation();
    availableServices.push(this.infoService);

    this.infoService
        .setCharacteristic(Characteristic.Manufacturer, "Hyperion")
        .setCharacteristic(Characteristic.Model, this.host)
        .setCharacteristic(Characteristic.SerialNumber, this.lightService.UUID);

    return availableServices;
}

