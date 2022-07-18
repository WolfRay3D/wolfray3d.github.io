function bmp(buffer, ar, sf) {
	var height = buffer.length / (ar * sf);
	var width = buffer.length / height;

	var data, offset = 54, size = width * height;

	data = [
		"BM",
		bytes4(offset + size),
		bytes4(0),
		bytes4(offset),
		bytes4(40),
		bytes4(width),
		bytes4(height),
		bytes2(1),
		bytes2(32),
		bytes4(0),
		bytes4(size),
		bytes4(0),
		bytes4(0),
		bytes4(0),
		bytes4(0)
	].join("");

	var px = [];

	for (var i = buffer.length - 1; i > -1; i--) {
		var y = 0 | i / width;
		var x = i - (y * width);

		px[x + width * (height - y)] = bytes4(buffer[i]);
	}

	return data + px.join("");
}

function render(buffer, width, height) {
	return "data:img/bmp;base64," + btoa(bmp(buffer, width / height, height));
}

function bytes2(n) {
	return String.fromCharCode(n & 255, (n >> 8) & 255);
}

function bytes4(n) {
	return String.fromCharCode(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255);
}

function rgb(r, g, b) {
	return (255 << 24) + (r << 16) + (g << 8) + b;
}