var wrs_special_forms = {
	"do": function (args, scope) {
		var value = false;
		
		for (var arg of args) {
			value = wrs_evaluate(arg, scope);
		}
		
		return value;
	},
	
	"define": function (args, scope) {
		if (args.length != 2 || args[0].type != "word") {
			throw new Error("Неправильные параметры объявления");
		}
		
		var value = wrs_evaluate(args[1], scope);
		scope[args[0].name] = value;
		
		return value;
	},
	
	"if": function (args, scope) {
		if (args.length != 3) {
			
		} else if (wrs_evaluate(args[0], scope) !== false) {
			return wrs_evaluate(args[1], scope);
		} else {
			return wrs_evaluate(args[2], scope);
		}
	},
	
	"proc": function (args, scope) {
		if (!args.length) throw new Error("У Процедуры должно быть тело");
		
		var body = args[args.length - 1];
		
		var params = args.slice(0, args.length - 1).map(function (expr) {
			if (expr.type != "word") {
				throw new SyntaxError("Параметры должны являться словами");
			}
			
			return expr.name;
		});
		
		return function () {
			if (arguments.length != params.length) throw new Error("Мало аргументов функции");
			
			var wrs_local_scope = Object.create(scope);
			
			for (var i = 0; i < arguments.length; i++) {
				wrs_local_scope[params[i]] = arguments[i];
			}
			
			return wrs_evaluate(body, wrs_local_scope);
		};
	},
	
	"set": function (args, scope) {
		if (args.length != 2 || args[0].type != "word") {
			throw new Error("Неправильные параметры настройки переменной");
		}
		
		var val_name = args[0].name;
		var value = wrs_evaluate(args[1], scope);
		
		for (var i = scope; i; i = Object.getPrototypeOf(i)) {
			if (Object.prototype.hasOwnProperty.call(i, val_name)) {
				i[val_name] = value;
				return value;
			}
		}
		throw new ReferenceError("Попытка создать переменную '" + val_name + "' не завершилась успехом");
	},
	
	"while": function (args, scope) {
		if (args.length != 2) {
			throw new Error("Мало операторов в цикле");
		}
		
		while (wrs_evaluate(args[0], scope) !== false) {
			wrs_evaluate(args[1], scope);
		}
		
		return false;
	}
};

wrs_special_forms["->"] = wrs_special_forms["proc"];
wrs_special_forms["def"] = wrs_special_forms["define"];

var wrs_top_scope = Object.create(null);

for (var op of [ "+", "-", "*", "/", "==", "<", ">" ]) {
	wrs_top_scope[op] = Function("a, b", "return a " + op + " b;");
}

wrs_top_scope["alen"] = function (arr) {
	return arr.length;
};

wrs_top_scope["arr"] = wrs_top_scope["array"] = function (...args) {
	return args;
};

wrs_top_scope["[]"] = wrs_top_scope["element"] = function (arr, n) {
	return arr[n];
};

wrs_top_scope["false"] = false;
wrs_top_scope["true"] = true;

wrs_top_scope["outfr"] = function (x, y, w, h, r, g, b) {
	return { data: rgb(r, g, b), i: x + w * y };
};

wrs_top_scope["print"] = function (value) {
	alert(value);
	return value;
};

wrs_top_scope["rgb"] = function (r, g, b) {
	return rgb(r, g, b);
};

wrs_top_scope["wr_color_r"] = 0;
wrs_top_scope["wr_color_g"] = 0;
wrs_top_scope["wr_color_b"] = 0;

wrs_top_scope["wr_pixel"] = 0;
wrs_top_scope["wr_pixel_data"] = [];
wrs_top_scope["wr_pixel_index"] = 0;

wrs_top_scope["wr_pos_x"] = 0;
wrs_top_scope["wr_pos_y"] = 0;

wrs_top_scope["wr_res_x"] = 0;
wrs_top_scope["wr_res_y"] = 0;

function main() {
	var generate = document.getElementById("generate");
	var shader = document.getElementById("shader");
	
	var renderer = document.getElementById("renderer");
	
	var height = document.getElementById("height");
	var width = document.getElementById("width");
	
	generate.onclick = function () {
		wrs_run(shader.value);
		
		height.value = wrs_top_scope["wr_res_y"];
		width.value = wrs_top_scope["wr_res_x"];
		
		console.log(wrs_top_scope);
		
		var r = render((function (a, b) {
			var arr = new Array(a * b);
			
			for (var i = 0; i < a * b; i++) {
				var y = 0 | i / a;
				var x = i - (y * a);
				
				wrs_top_scope["wr_pos_x"] = x;
				wrs_top_scope["wr_pos_y"] = y;
				
				var px = wrs_top_scope["outfr"](x, y, a, b, wrs_top_scope["wr_color_r"], wrs_top_scope["wr_color_g"], wrs_top_scope["wr_color_b"]);
				
				arr[px.i] = px.data;
			}
			
			return arr;
		})(width.value, height.value), width.value, height.value);
		
		renderer.height = height.value;
		renderer.src = r;
		renderer.width = width.value;
	};
}

function wrs_evaluate(expr, scope) {
	if (expr.type == "value") {
		return expr.value;
	} else if (expr.type == "word") {
		if (expr.name in scope) {
			return scope[expr.name];
		} else {
			throw new ReferenceError("Неизвестное выражение " + expr.name);
		}
	} else if (expr.type == "apply") {
		var obj = expr;
		
		if (obj.operator.type == "word" && obj.operator.name in wrs_special_forms) {
			return wrs_special_forms[obj.operator.name](expr.args, scope);
		} else {
			var op = wrs_evaluate(obj.operator, scope);
			
			if (typeof op == "function") {
				return op(...obj.args.map(function (arg) {
					return wrs_evaluate(arg, scope);
				}));
			} else {
				throw new Error("Выполнение нефункционального типа.");
			}
		}
	}
}

function wrs_parse(program) {
	var obj = wrs_parse_expression(program);
	
	if (wrs_skip_space(obj.rest).length > 0) {
		throw new Error("Текст после программы");
	}
	
	return obj.expr;
}

function wrs_parse_apply(expr, program) {
	program = wrs_skip_space(program);
	
	if (program[0] != "(") return {
		expr: expr, rest: program
	};
	
	program = wrs_skip_space(program.slice(1));
	expr = { type: "apply", operator: expr, args: [] };
	
	while (program[0] != ")") {
		var arg = wrs_parse_expression(program);
		expr.args.push(arg.expr);
		program = wrs_skip_space(arg.rest);
		
		if (program[0] == ",") program = wrs_skip_space(program.slice(1));
		else if (program[0] != ")") {
			throw new Error("Программа не имеет завершения (')') или продолжения: (','): " + program);
		}
	}
	
	return wrs_parse_apply(expr, program.slice(1));
}

function wrs_parse_expression(program) {
	program = wrs_skip_space(program);
	
	var match, expr;
	
	if (match = /^"([^"]*)"/.exec(program)) {
		expr = { type: "value", value: match[1] };
	} else if (match = /^\d+\b/.exec(program)) {
		expr = { type: "value", value: Number(match[0]) };
	} else if (match = /^[^\s(),"]+/.exec(program)) {
		expr = { type: "word", name: match[0] };
	} else {
		throw new Error("Ошибка: неправильный синтаксис языка программы " + program + ".");
	}
	
	return wrs_parse_apply(expr, program.slice(match[0].length));
}

function wrs_run(program) {
	return wrs_evaluate(wrs_parse(program), Object.create(wrs_top_scope));
}

function wrs_skip_space(text) {
	var first = text.search(/\S/);
	
	if (/#.+/.exec(text)) {
		while (/#.+/.exec(text)) {
			text = text.replace(/#.+/.exec(text)[0] + "\n", "");
		}
	}
	
	if (first == -1) return "";
	
	return text.slice(first);
}

main();