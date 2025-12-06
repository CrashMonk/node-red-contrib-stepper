/**

 stepper.js - Copyright 2023 Harshad Joshi and Bufferstack.IO Analytics Technology LLP, Pune

 Licensed under the GNU General Public License, Version 3.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 https://www.gnu.org/licenses/gpl-3.0.html

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 **/


module.exports = function(RED) {
    function StepperNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.from = Number(config.from);
        node.to = Number(config.to);
        node.step = Number(config.step);
        node.duration = Number(config.duration);
        node.currentValue = node.from;
        var intervalId = null;
        var isPaused = false;
        var pausedValue = null;

        function startStepping() {
            if (intervalId !== null) {
                clearInterval(intervalId); // Ensure no intervals are already running
            }
            if (isPaused && pausedValue !== null) {
                node.currentValue = pausedValue;
                isPaused = false;
            }
            intervalId = setInterval(function() {
                if ((node.from < node.to && node.currentValue >= node.to) ||
                    (node.from > node.to && node.currentValue <= node.to)) {
                    clearInterval(intervalId);
                    intervalId = null;
                    node.send({payload: node.currentValue});
                    node.status({fill:"green", shape:"dot", text:"Stepping completed"});
                    return;
                }
                node.send({payload: node.currentValue});
                node.status({fill:"blue", shape:"dot", text:"Stepping..."});
                node.currentValue += (node.from < node.to) ? node.step : -node.step;
            }, node.duration);
        }

        function stopStepping() {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
                pausedValue = node.currentValue;
                isPaused = true;
                node.status({fill:"red", shape:"ring", text:"Stepping paused"});
            }
        }

        function resetStepping() {
            stopStepping(); // Stop any existing stepping process
            node.currentValue = node.from; // Reset the current value
            node.send({payload: node.currentValue, topic: "reset"});
            node.status({}); // Clear status ideally should be orange 
        }

        node.on('input', function(msg) {
            if(msg.config !== undefined) {
                // defaults suitable dashboard progress
                node.from = Number(msg.config.from || 1);
                node.to = Number(msg.config.to || 100);
                node.step = Number(msg.config.step || 1);
                node.duration = Number(msg.config.duration || 10000);
            }
            if (msg.topic !== undefined) {
                switch (msg.topic) {
                    case "start":
                        startStepping();
                        break;
                    case "stop":
                        stopStepping();
                        break;
                    case "reset":
                        resetStepping();
                        break;
                    case "resume":
                        startStepping(); // Resume stepping
                        break;
                    default:
                        node.warn("Received unknown topic or incorrect payload. Expected topics: start, stop, reset, resume.");
                        break;
                }
            } else {
                node.warn("Ignoring input: topic not defined");
            }
        });

        node.on('close', function() {
            stopStepping(); // Clear interval on node redeployment or shutdown
        });

        // Initial status
        node.status({fill:"blue", shape:"dot", text:"Ready"});
    }
    RED.nodes.registerType("stepper", StepperNode);
}

//stepper.js ends
