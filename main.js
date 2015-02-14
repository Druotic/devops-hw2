var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}


function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	}
};

function generateTestCases()
{

	var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\'';
		}

		console.log( "params: " );
		console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		console.log(constraints);
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {mocking: 'fileWithContent' });
		var pathExists      = _.some(constraints, {mocking: 'fileExists' });

		var new_constraints = [];
		// transform contraints into-  var: [array of possible vals]
		for( var c = 0; c < constraints.length; c++)
		{
			var constraint = constraints[c];
			var assoc = {};
			var inserted = false;
			
			for( var new_c = 0; new_c < new_constraints.length; new_c++)
			{
				if (Object.keys(new_constraints[new_c])[0] === constraint.ident)
				{
					console.log("@");
					console.log(new_constraints);
					console.log(new_constraints[new_c]);
					var e = new_constraints[new_c];
					e[constraint.ident] = e[constraint.ident].concat(constraint.value);
					new_constraints[new_c] = e;
					inserted = true;
				}
			}
			if (!inserted)
			{
				assoc[constraint.ident] = [constraint.value];
				new_constraints.push(assoc);
			}

//			if(new_constraints.hasOwnProperty(constraint.ident))
//				Array.prototype.push.apply(new_constraints[constraint.ident], [constraint.value]);
//			else
//			{
//				assoc[constraint.ident] = constraint.value;
//				new_constraints.push(assoc);
//			}
		}

		constraints = new_constraints;

		var keys = Object.keys(params);
		var nc_keys = new_constraints.map(function (c) {return Object.keys(c)[0]});
		var keys_to_add = _.difference(keys, nc_keys);
		
		//insert \'\' for any params which have no constraints
		for( var k = 0; k < keys_to_add.length; k++)
		{
			assoc = {};
			assoc[keys_to_add[k]] = ["\'\'"];
			constraints = constraints.concat(assoc);
		}


		console.log("params:");
		console.log(_.pairs(params));
		console.log("-----");
		console.log(constraints);
		console.log("---sorted:");
//		constraints = ([ {q: [ 'undefined', -1 ]}, {p: [ '\'\'' ]} ]);
		
		
		// get array of keys for sorting of arguments
		var sorted_keys = _.pairs(params).map(function (p) {return p[0]});
		
		for(var key in constraints)
		{
			console.log(key);
			console.log(sorted_keys.indexOf(key));
		}
		//constraints.forEach(function(c1, c2){process.exit(c1); console.log(c2);});
		console.log(constraints.sort(
			function(c1, c2){
				console.error("test");
				return sorted_keys.indexOf(Object.keys(c1)[0]) - sorted_keys.indexOf(Object.keys(c2)[0]);
			}));
		
//		process.exit(1);
		console.log(constraints instanceof Array);
		console.log("-----!!!!!!!!!!!!!!!!!!!!!!!!");
		console.log(
		cartesianProductOf.apply(this, constraints.map(function (k){return k[Object.keys(k)[0]]}))
);


		var argArrays = cartesianProductOf.apply(this, constraints.map(function (k){return k[Object.keys(k)[0]]}));
		for (var a = 0; a < argArrays.length; a++) {
			var args = argArrays[a].join(",");
			if(!(pathExists || fileWithContent))
				content += "subject.{0}({1});\n".format(funcName, args );
		}

		console.log("TESTINGIGIGNINGG:");
		console.log(params);

		// Hardcoded args for file existence cases.  This should really be redone. The overall
		// structure of the params vs constraints arrays was originally bad for having multiple 
		// args for the same param. I'm leaving this hardcoded here because it was originally pretty
		// hardcoded (the files - hence the four calls with pathExists vs !pathExists, etc below)
		var args = ["\'path/fileExists\'", "\'pathContent/file1\'"];
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists,fileWithContent,funcName, args);
			// Bonus...generate constraint variations test cases....
			content += generateMockFsTestCases(!pathExists,!fileWithContent,funcName, args);
			content += generateMockFsTestCases(pathExists,!fileWithContent,funcName, args);
			content += generateMockFsTestCases(!pathExists,fileWithContent,funcName, args);
		}
//		else
//		{
//			// Emit simple test case.
//			content += "subject.{0}({1});\n".format(funcName, args );
//		}

	}

	console.log("FINAL, before sync write: -----");
	//console.log(content);
	console.log("end content----");
	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists,fileWithContent,funcName,args) 
{
	var testCase = "";
	// Insert mock data based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression')
				{
					if( child.left.type === 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						if( child.operator === "==")
						{
							// get expression from original source code:
							//var expression = buf.substring(child.range[0], child.range[1]);
							pushConstraint(funcName, child.left.name, rightHand);
							pushConstraint(funcName, child.left.name, -1);
						}
						else if( child.operator === "<")
						{
							pushConstraint(funcName, child.left.name, rightHand);
							pushConstraint(funcName, child.left.name, rightHand-1);
							
						}
					}
				}

				

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'pathContent/file1'",
								mocking: 'fileWithContent'
							});
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							console.log("HMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
							console.log(params[p]);
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'path/fileExists'",
								mocking: 'fileExists'
							});
						}
					}
				}

			});

			console.log( functionConstraints[funcName]);

		}
	});
}

		//get all possible combinations (cartesian product) of args
		//reference: http://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
		function cartesianProductOf() {
			return _.reduce(arguments, function(a, b) {
				return _.flatten(_.map(a, function(x) {
					return _.map(b, function(y) {
						return x.concat([y]);
					});
				}), true);
			}, [ [] ]);
		};

function pushConstraint(funcName, id, val)
{
	functionConstraints[funcName].constraints.push( 
	{
		ident: id,
		value: val
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
