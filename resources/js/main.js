var Main = function() {
	var ALTITUDE_MIN = 75;
	var ALTITUDE_MAX = 600;

	var _scene, _camera, _renderer;
	var _planeGeometry, _planeMesh, _planeMaterial;

	var _fuselageMesh, _rotorMesh;
	var _fuselageMaterial, _rotorMaterial;
	var _light;

	var _grabbing;
	var _grab;
	var _startingAngle;
	var _force = 0.1;

	var $body;
	var $beta, $gamma, $force;

	function init() {
		$(document).ready(function() {
			$body = $("body");
			$beta = $(".beta");
			$gamma = $(".gamma");
			$force = $(".force");

			_grabbing = false;
			_startingAngle = 0;

			_scene = new THREE.Scene();

			// Set camera.
			_camera = new THREE.PerspectiveCamera(
				50, 
				$(window).width() / $(window).height(),
				1,
				10000);
			// _camera.position.x = 0;
			_camera.position.y = 0;
			_camera.position.z = 2000;

			// Create and add floor to scene.
			_planeGeometry = new THREE.PlaneGeometry(1000, 1000, 32);
			_planeMaterial = new THREE.MeshBasicMaterial({
				color: 0xcccccc,
				side: THREE.DoubleSide
			});
			_planeMesh = new THREE.Mesh(_planeGeometry, _planeMaterial);
			_planeMesh.castShadow = true;
			_planeMesh.receiveShadow = true;
			_scene.add(_planeMesh);


			// Create and add light to scene.
			// _light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
			_light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
			// _light.position.set(0, 5, 7);
			_light.position.set(5, 0, 5);
			_light.castShadow = true;
			_scene.add(_light);


			var otherLight = new THREE.DirectionalLight( 0xFFFFFF, 1 );
			otherLight.position.set(-5, 0, 5);
			otherLight.castShadow = true;
			_scene.add(otherLight);


			// Load fuselage and add to scene.
			var fuselageMaterialLoader = new THREE.MTLLoader();
			fuselageMaterialLoader.load(
				"resources/model/helicopter-fuselage-gd.mtl",
				function(materials) {
					materials.preload();

					var fuselageLoader = new THREE.OBJLoader();
					fuselageLoader.setMaterials(materials);
					fuselageLoader.load(
						"resources/model/helicopter-fuselage-gd.obj",
						function(object) {
							_fuselageMesh = object;
							_fuselageMesh.position.x = 0;
							_fuselageMesh.position.y = 0;
							_fuselageMesh.position.z = 75;
							_fuselageMesh.scale.x = 60;
							_fuselageMesh.scale.y = 60;
							_fuselageMesh.scale.z = 60;
							_fuselageMesh.rotation.x = Math.radians(90);
							_fuselageMesh.castShadow = true;
							_fuselageMesh.receiveShadow = true;
							_scene.add(_fuselageMesh);

							// Load rotor and add to scene.
							var rotorMaterialLoader = new THREE.MTLLoader();
							rotorMaterialLoader.load(
								"resources/model/helicopter-rotor.mtl",
								function(materials) {
									materials.preload();

									var rotorLoader = new THREE.OBJLoader();
									rotorLoader.setMaterials(materials);
									rotorLoader.load(
										"resources/model/helicopter-rotor.obj",
										function(object) {
											_rotorMesh = object;
											_rotorMesh.position.x = 0;
											_rotorMesh.position.y = 0;
											_rotorMesh.position.z = 0;
											_rotorMesh.castShadow = true;
											_rotorMesh.receiveShadow = true;

											_fuselageMesh.add(_rotorMesh);
											spinRotor();
											_renderer.render(_scene, _camera);

										}
									);
								}
							);
						}
					);
				}
			);

			// Default scene rotation.
			_scene.rotation.x = -20;

			_renderer = new THREE.WebGLRenderer({ antialias: true });
			_renderer.setPixelRatio( window.devicePixelRatio );
			_renderer.shadowMap.enabled = true;
			_renderer.shadowMap.type = THREE.PCFSoftShadowMap;

			refresh();

			$body.append(_renderer.domElement);

			_renderer.render(_scene, _camera);

			$(window).resize(function(event) {
				refresh();
			});

			$(window).on("deviceorientation", function(event) {
				var beta = event.originalEvent.beta;
				var gamma = event.originalEvent.gamma;
				var portraitMode = $(window).height() > $(window).width();
				var landscapeModeLeft = !portraitMode && (gamma < 0);
				var landscapeModeRight = !portraitMode && (gamma >= 0);
				var pitchAdjustment = 0;

				if (portraitMode) {
					pitchAdjustment = 30;
					pitch(beta + pitchAdjustment);
					roll(gamma);	
				} else if (landscapeModeLeft) {
					pitchAdjustment = 30;
					pitch(Math.abs(gamma) + pitchAdjustment);
					roll(beta);
				} else if (landscapeModeRight) {
					pitchAdjustment = 30;
					pitch(gamma + pitchAdjustment);
					roll(beta);
				}

				$beta.text("β = " + Math.round(beta));
				$gamma.text("ɣ = " + Math.round(gamma));
			});

			$(window).on("touchstart", function(event) {
				var position = {
					x: event.originalEvent.touches[0].pageX - ($(window).width() / 2),
					y: event.originalEvent.touches[0].pageY - ($(window).height() / 2)
				};
				onGrab(position);
			});

			$(window).on("mousedown", function(event) {
				var position = {
					x: event.pageX - ($(window).width() / 2),
					y: event.pageY - ($(window).height() / 2)
				};
				onGrab(position);
			});

			$(window).on("touchmove", function(event) {
				event.preventDefault();

				var position = {
					x: event.originalEvent.touches[0].pageX - ($(window).width() / 2),
					y: event.originalEvent.touches[0].pageY - ($(window).height() / 2)
				};
				onDrag(position);
			});

			$(window).on("mousemove", function(event) {
				var position = {
					x: event.pageX - ($(window).width() / 2),
					y: event.pageY - ($(window).height() / 2)
				};
				onDrag(position);
			});

			$(window).on("touchend", function(event) {
				var position = {
					x: event.originalEvent.touches[0].pageX - ($(window).width() / 2),
					y: event.originalEvent.touches[0].pageY - ($(window).height() / 2)
				};
				onDrop(position);
			});

			$(window).on("mouseup", function(event) {
				var position = {
					x: event.pageX - ($(window).width() / 2),
					y: event.pageY - ($(window).height() / 2)
				};
				onDrop(position);
			});

			$(window).on("webkitmouseforcechanged", function(event) {
				var force = event.originalEvent.changedTouches[0].force;
				onPress(force);
			});

			$(window).on("touchforcechange", function(event) {
				var force = event.originalEvent.changedTouches[0].force;
				onPress(force);
			});

		});
	}

	function altitude() {
		var altitude = ALTITUDE_MIN + (_force * (ALTITUDE_MAX - ALTITUDE_MIN));
		// _fuselageMesh.position.z = altitude;

		// Damping.
		TweenMax.to(_fuselageMesh.position, 0.75, {z: altitude});
	}

	function onGrab(position) {
		_grabbing = true;
		_grab = position;
		_startingAngle = _scene.rotation.z;
		$body.addClass("is-grabbed");
		console.log("grab " + JSON.stringify(position));
	}

	function onDrag(position) {
		if (_grabbing) {
			// var a = Math.round(Math.abs(position.x - _grab.x));
			// var b = Math.round(Math.abs(position.y - _grab.y));
			// var realDistance = Math.sqrt(a*a + b*b);

			var a = Math.round(position.x - _grab.x);
			var b = Math.round(position.y - _grab.y);
			var distance = Math.sqrt(a*a + b*b);

			if (position.x < _grab.x) {
				distance *= -1;
			}


			// var distance = Math.round(position.x - _grab.x);
			var sensitivity = 0.2;
			var degrees = distance * sensitivity;
			console.log("\tdrag distance " + Math.radians(degrees));


			if (position.y < 0) {
				_scene.rotation.z = _startingAngle - Math.radians(degrees);
			} else {
				_scene.rotation.z = _startingAngle + Math.radians(degrees);
			}

			_renderer.render(_scene, _camera);
		}
	}

	function onDrop(position) {
		_grabbing = false;
		$body.removeClass("is-grabbed");
		console.log("drop " + JSON.stringify(position));	
	}

	function onPress(force) {
		// if (force > 0.5) {
			_force = force;
		// } else {
		// 	_force = 0;
		// }
		altitude();
		$force.text("F = " + _force.toFixed(2));
	}

	function refresh() {
		_renderer.setSize($(window).width(), $(window).height());
		_camera.aspect = $(window).width() / $(window).height();
		_camera.updateProjectionMatrix();
		_renderer.render(_scene, _camera);
	}

	function pitch(degrees) {
		// _scene.rotation.x = (-degrees * Math.PI) / 180;
		_scene.rotation.x = -Math.radians(degrees);
		_renderer.render(_scene, _camera);
	}

	function roll(degrees) {
		// _scene.rotation.y = (-degrees * Math.PI) / 180;
		_scene.rotation.y = -Math.radians(degrees);
		_renderer.render(_scene, _camera);
	}

	function spinRotor() {
		requestAnimationFrame(spinRotor);
		// _rotorMesh.rotation.y += 0.1;	
		// console.log(_force);
		if (_force < 0.1) _force = 0.1;
		_rotorMesh.rotation.y -= _force;		
		_renderer.render(_scene, _camera);
	}

	return {
		init:init
	};
}();

Main.init();