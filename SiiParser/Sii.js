BigInt.prototype.toJSON = function() { return this.toString(); }
class Sii 
{
	static Parse(siiString)
	{
		return ParseSii(siiString);
	}

	static Serialize(siiObject)
	{
		var keys = Object.keys(siiObject);
		var lastKey = keys[keys.length-1];

		var siiSerialized = '';
		siiSerialized += 'SiiNunit\r\n';
		siiSerialized += '{\r\n';
		for (let i = 0; i < siiObject.__order.length; i++) {
			siiSerialized += SerializeBlock(siiObject, siiObject.__order[i][0], siiObject.__order[i][1], (i == siiObject.__order.length - 1)? true:false);
		}
		/*for(var key in siiObject)
		{
			siiSerialized += SerializeBlocks(key, siiObject[key], (key == lastKey)? true:false);
		}*/
		siiSerialized += '}';
		return siiSerialized;
	}
}

function SerializeBlock(siiObject, siiKey, token, isLastBlock)
{
	var serializedBlocks = '';
	serializedBlocks += `${siiKey} : ${token} {\r\n`;
		serializedBlocks += SerializeSegments(siiObject[siiKey][token]);
		if(!isLastBlock)
		{
			serializedBlocks += `}\r\n\r\n`;
		}
		else
		{
			serializedBlocks += `}\r\n`;
		}
	return serializedBlocks;
	return ''
}

function SerializeBlocks(key, object, isLastBlock)
{
	var serializedBlocks = '';
	for(var token in object)
	{
		serializedBlocks += `${key} : ${token} {\r\n`;
		serializedBlocks += SerializeSegments(object[token]);
		if(!isLastBlock)
		{
			serializedBlocks += `}\r\n\r\n`;
		}
		else
		{
			serializedBlocks += `}\r\n`;
		}
	}
	return serializedBlocks;
}

function SerializeSegments(segments)
{
	var serializedSegments = '';
	for(var segment in segments)
	{
		if(typeof segments[segment] == 'bigint')
		{
			serializedSegments += ` ${segment}: ${segments[segment]}\r\n`
		}
		
		else if(typeof segments[segment] == 'string')
		{
			serializedSegments += ` ${segment}: "${segments[segment]}"\r\n`
		}

		else if(Array.isArray(segments[segment]))
		{
			serializedSegments += ` ${segment}: ${segments[segment].length}\r\n`
			for (let i = 0; i < segments[segment].length; i++) {
				const element = segments[segment][i];
				if(element != null)
				{
					if(typeof element == 'bigint')
					{
						serializedSegments += ` ${segment}[${i}]: ${element}\r\n`
					}
					else if(typeof element == 'string')
					{
						serializedSegments += ` ${segment}[${i}]: "${element}"\r\n`
					}
					else
					{
						serializedSegments += ` ${segment}[${i}]: ${element.toString()}\r\n`
					}
				}
				else
				{
					serializedSegments += ` ${segment}[${i}]: null\r\n`
				}
			}
		}
		else
		{
			if(segments[segment] != null)
			{
				if(typeof segments[segment] == 'bigint')
				{
					serializedSegments += ` ${segment}: ${segments[segment]}\r\n`
				}
				else
				{
					serializedSegments += ` ${segment}: ${segments[segment].toString()}\r\n`
				}
			}
			else
			{
				serializedSegments += ` ${segment}: null\r\n`
			}
		}
	}
	//console.log(segments.constructor.name)
	return serializedSegments;
}


class Token {
	constructor(token)
	{
		this.token = token;
	}

	toString()
	{
		return this.token;
	}
}

class Set {
	constructor(x, y, z)
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}
	toString()
	{
		return `(${this.x}, ${this.y}, ${this.z})`;
	}
}

class Vector4 {
	constructor(w,x,y,z)
	{
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	toString()
	{
		return `(${this.w}; ${this.x}, ${this.y}, ${this.z})`;
	}
}

class Transform {
	constructor(x,y,z,rw,rx,ry,rz)
	{
		this.x = x;
		this.y = y;
		this.z = z;

		this.rx = rx;
		this.ry = ry;
		this.rz = rz;
		this.rw = rw;
	}

	toString()
	{
		return `(${this.x}, ${this.y}, ${this.z}) (${this.rw}; ${this.rx}, ${this.ry}, ${this.rz})`;
	}
}

function ParseSii(str)
{
	let regex = /([a-zA-Z_-]+)\s:\s([\w\d_\-\.]+)[\n\s]*\{[\r]*([^}]+)/gm;
	var SiiNunit = {__order:[]};

	var lines = str.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const element = lines[i];
		if(regex.test(lines[i]))
		{
			SiiNunit.__order.push(lines[i].replace('{', '').trim().split(' : '));
		}
	}
	
	let m;
	while ((m = regex.exec(str)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		
		if(typeof SiiNunit[m[1]] == 'undefined')
		{
			SiiNunit[m[1]] = {}
		}
		SiiNunit[m[1]][m[2]] = ParseBlock(m[3]);
	}
	return SiiNunit;
}

function ParseBlock(block)
{
	block = block.replace(/\r/g, '');
	let blockSegments = block.split('\n');
	let parsedBlock = {};

	for (let i = 0; i < blockSegments.length; i++) {
		if(blockSegments[i] != '')
		{
			segmentParsed = ParseSegment(blockSegments[i], i);
			if(segmentParsed[2])
			{
				if(Array.isArray(parsedBlock[segmentParsed[0]]))
				{
					parsedBlock[segmentParsed[0]][segmentParsed[3]] = segmentParsed[1];
				}
				else
				{
					parsedBlock[segmentParsed[0]] = [];
					parsedBlock[segmentParsed[0]][segmentParsed[3]] = segmentParsed[1];
				}
			}
			else
			{
				parsedBlock[segmentParsed[0]] = segmentParsed[1];
			}
		}
	}
	return parsedBlock;
}

function ParseSegment(segment, line)
{
	let regexSegmentKeyTest = /^[a-zA-Z0-9_-]+$/;
	let regexSegmentArrayTest = /([a-zA-Z0-9_-]+)\[([0-9]+)\]/;
	let keyValue = segment.split(':');
	let isArray = (regexSegmentArrayTest.test(keyValue[0].trim()));
	let m = regexSegmentArrayTest.exec(keyValue[0]);

	let composedValue = keyValue.slice(1).join(':');
	return [(m==null)?keyValue[0].trim():m[1], GetValue(composedValue.trim(), keyValue[0].trim()), isArray, (m != null)? parseInt(m[2]):0];
}

function GetValue(segment, key){
	let regexSegmentNumberTest = /^(\-?[0-9]+)$/;
	let regexSegmentNumber =     /(\-?[0-9]+)/gm;

	let regexSegmentStringTest = /^"([\w\d\s\W.]*)"$/;
	let regexSegmentString =     /"([\w\d\s\W.]*)"/gm;

	let regexSegmentTokenTest = /([a-zA-Z0-9_&][a-zA-Z0-9_.]+)/;
	let regexSegmentToken =     /([a-zA-Z0-9_&][a-zA-Z0-9_.]+)/gm;

	let regexSegmentSetTest = /\((-?[a-zA-Z0-9&]+)\s*,\s?(-?[a-zA-Z0-9&]+)\s*,\s*(-?[a-zA-Z0-9&]+)\)\s*$/;
	let regexSegmentSet =     /\((-?[a-zA-Z0-9&]+)\s*,\s?(-?[a-zA-Z0-9&]+)\s*,\s*(-?[a-zA-Z0-9&]+)\)\s*$/gm;

	let regexSegmentVec4Test = /^\s*\((-?[a-zA-Z0-9&]+);?\s?(-?[a-zA-Z0-9&]+?\s?),?\s?(-?[a-zA-Z0-9&]+\s?),?\s?(-?[a-zA-Z0-9&]+\s?)\)\s*$/;
	let regexSegmentVec4Set =  /^\s*\((-?[a-zA-Z0-9&]+);?\s?(-?[a-zA-Z0-9&]+?\s?),?\s?(-?[a-zA-Z0-9&]+\s?),?\s?(-?[a-zA-Z0-9&]+\s?)\)\s*$/gm;

	let regexSegmentTransformTest = /\((-?[a-zA-Z0-9&]+)\s*,\s?(-?[a-zA-Z0-9&]+)\s*,\s*(-?[a-zA-Z0-9&]+)\)\s\((-?[a-zA-Z0-9&]+);?\s?(-?[a-zA-Z0-9&]+?\s?),?\s?(-?[a-zA-Z0-9&]+\s?),?\s?(-?[a-zA-Z0-9&]+\s?)\)/;
	let regexSegmentTransformSet =  /\((-?[a-zA-Z0-9&]+)\s*,\s?(-?[a-zA-Z0-9&]+)\s*,\s*(-?[a-zA-Z0-9&]+)\)\s\((-?[a-zA-Z0-9&]+);?\s?(-?[a-zA-Z0-9&]+?\s?),?\s?(-?[a-zA-Z0-9&]+\s?),?\s?(-?[a-zA-Z0-9&]+\s?)\)/gm;
	
	if(regexSegmentNumberTest.test(segment))
	{
		let m;
		while ((m = regexSegmentNumber.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentNumber.lastIndex) {
				regexSegmentNumber.lastIndex++;
			}
			return BigInt(m[1]);
		}
	}
	else if(regexSegmentSetTest.test(segment))
	{
		let m;
		while ((m = regexSegmentSet.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentSet.lastIndex) {
				regexSegmentSet.lastIndex++;
			}
			return new Set(m[1], m[2], m[3]);
		}
	}
	else if(regexSegmentVec4Test.test(segment))
	{
		let m;
		while ((m = regexSegmentVec4Set.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentVec4Set.lastIndex) {
				regexSegmentVec4Set.lastIndex++;
			}
			return new Vector4(m[1], m[2], m[3], m[4]);
		}
	}
	else if(regexSegmentTransformTest.test(segment))
	{
		let m;
		while ((m = regexSegmentTransformSet.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentTransformSet.lastIndex) {
				regexSegmentTransformSet.lastIndex++;
			}
			return new Transform(m[1], m[2], m[3], m[4], m[5], m[6], m[7]);
		}
	}
	else if(regexSegmentStringTest.test(segment))
	{
		let m;
		while ((m = regexSegmentString.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentString.lastIndex) {
				regexSegmentString.lastIndex++;
			}
			return m[1];
		}
	}

	else if(regexSegmentTokenTest.test(segment))
	{
		let m;
		while ((m = regexSegmentToken.exec(segment)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === regexSegmentToken.lastIndex) {
				regexSegmentToken.lastIndex++;
			}
			if(m[1] == 'null')
			{
				return null;
			}
			else if(m[1] == 'true' || m[1] == 'false')
			{
				return (m[1] == 'true')? true:false;
			}
			else
			{
				return new Token(m[1]);
			}
		}
	}
	else
	{
		//console.log("================= ELSE",key, " | ", segment);
	}
}

module.exports = {
	Sii,
	Token,
	Vector4,
	Set,
	Transform
};
