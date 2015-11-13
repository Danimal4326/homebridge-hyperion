# homebridge-hyperion
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for Hyperion

This plugin allows you to remotely control the state of your Hyperion controlled lights.  It allows you to set the on/off state and change the brightness/color.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-hyperion
3. Update your configuration file. See below for a sample.

# Configuration

Configuration sample:

 ```
        "accessories": [
            {
                "accessory": "Hyperion",
                "name": "TV Backlight",
                "host": "localhost",
                "port": "19444"
            }
        ]
```

Fields:

* "accessory": Must always be "Hyperion" (required)
* "name": Can be anything (required)
* "host": The hostname or ip of the machine running Hyperion (required)
* "port": The port that Hyperion is using (usually 19444) (required)
