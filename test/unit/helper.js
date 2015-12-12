function Helper() {

    /**
     * Capture console output
     * @param stream
     * @param showStream
     * @return {{unhook: unhook, captured: captured}}
     */
    this.captureStream = function (stream, showStream) {
        showStream = (showStream === true);
        var oldWriter = stream.write;
        var buffer = '';
        stream.write = function (chunk, encoding, callback) {
            buffer += chunk.toString();
            if (showStream) {
                oldWriter.apply(stream, arguments);
            }
        };

        return {
            unhook: function unhook() {
                stream.write = oldWriter;
            },
            captured: function () {
                return buffer;
            }
        };
    }
}
module.exports = new Helper();