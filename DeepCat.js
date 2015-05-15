/**
 * DeepCat Gadget for MediaWiki
 * using JSONP CatGraph interface https://github.com/wmde/catgraph-jsonp
 * report issues / feature requests https://github.com/wmde/DeepCat-Gadget
 * @licence GNU GPL v2+
 * @author Christoph Fischer < christoph.fischer@wikimedia.de >
 */

(function () {
	var keyString = 'deepCat:';
	var maxDepth = 10;
	var maxResults = 50;
	var deepCatSearchTerms;
	var deepCatSearchString;
	var searchInput;
	var requestUrl = 'http://tools.wmflabs.org/catgraph-jsonp/gptest1wiki_ns14/traverse-successors%20Category:{0}%20' + maxDepth + '%20' + maxResults;

	$( function () {
		$( '#searchform, #search' ).on( 'submit', function ( e ) {
			searchInput = $( this ).find( '[name="search"]' ).val();

			deepCatSearchTerms = getDeepCatParams( searchInput );

			if ( deepCatSearchTerms ) {
				e.preventDefault();

				deepCatSearchString = removeDeepCatParams( searchInput );

				log( "deepCatSearchTerms: " + deepCatSearchTerms );
				log( "deepCatSearchString: " + deepCatSearchString );

				//bugfix to sync search fields for better recovery of "deepCatSearch"
				substituteInputValues( searchInput );

				sendAjaxRequests( deepCatSearchTerms );
			}
		} );

		//fake input field values
		var deepCatSearch = getUrlParameter( 'deepCatSearch' );

		if ( deepCatSearch && deepCatSearch.match( new RegExp( keyString ) ) ) {
			substituteInputValues( deepCatSearch.replace( /\+/g, ' ' ) );
		}
	} );

	function sendAjaxRequests( searchTerms ) {
		var requests = [];
		addAjaxThrobber();

		for ( var i = 0; i < searchTerms.length; i++ ) {
			requests.push( getAjaxRequest( searchTerms[i] ) );
		}

		$.when.apply( this, requests ).done( receiveAjaxResponses );
	}

	function getAjaxRequest( searchTerm ) {
		var categoryString = extractDeepCatCategory( searchTerm );
		var userParameter = {
			negativeSearch: ( searchTerm.charAt( 0 ) === '-' )
		};

		return $.ajax( {
			url: String.format( requestUrl, categoryString ),
			data: { userparam: JSON.stringify( userParameter ) },
			dataType: 'jsonp',
			jsonp: 'callback',
			error: fatalAjaxError
		} )
	}

	function receiveAjaxResponses() {
		var responses = [];
		removeAjaxThrobber();

		//single request leads to different variable structure
		if ( typeof arguments[1] === 'string' ) {
			arguments = [arguments];
		}

		for ( var i = 0; i < arguments.length; i++ ) {
			var ajaxResponse = arguments[i][0];

			if ( arguments[i][1] !== 'success' ) {
				ajaxError( arguments[i] );
				return;
			} else if ( ajaxResponse['status'] !== 'OK' ) {
				graphError( ajaxResponse );
				return;
			}

			ajaxSuccess( ajaxResponse );
			responses.push( ajaxResponse );
		}

		substituteSearchRequest( composeNewSearchString( responses ) );
		$( '#searchform' ).submit();
	}

	function composeNewSearchString( responses ) {
		var searchString = '';

		for ( var i = 0; i < responses.length; i++ ) {
			var userParameters = JSON.parse( responses[i]['userparam'] );

			if ( userParameters['negativeSearch'] ) {
				searchString += '-';
			}

			searchString += 'incategory:id:' + responses[i]['result'].join( '|id:' ) + ' ';
		}

		return searchString += ' ' + deepCatSearchString;
	}

	function ajaxSuccess( data ) {
		log( "graph & ajax request successful" );
		log( "statusMessage: " + data['statusMessage'] );
	}

	function graphError( data ) {
		log( "graph request failed" );
		log( "statusMessage: " + data['statusMessage'] );

		substituteSearchRequest( ' ' );
		$( '#searchform' ).submit();
	}

	function ajaxError( data ) {
		log( "ajax request error: " + JSON.stringify( data ) );

		substituteSearchRequest( ' ' );
		$( '#searchform' ).submit();
	}

	function fatalAjaxError( data, error ) {
		ajaxError( error );
	}

	function substituteSearchRequest( searchString ) {
		$( '[name="search"]' ).attr( 'name', 'deepCatSearch' );
		$( '<input>' ).attr( {
			type: 'hidden',
			name: 'search',
			value: searchString
		} ).appendTo( '#searchform' );
	}

	function substituteInputValues( input ) {
		$( '[name="search"]' ).val( input );
	}

	function deepCatRegExp( keyword ) {
		return new RegExp( '(-?' + keyword + '(("[^"]*")|([^"\\s]*)))', 'g' );
	}

	function getDeepCatParams( input ) {
		return input.match( deepCatRegExp( keyString ) );
	}

	function removeDeepCatParams( input ) {
		return input.replace( deepCatRegExp( keyString ), '' );
	}

	function extractDeepCatCategory( searchTerm ) {
		var categoryString = searchTerm.replace( new RegExp( '-?' + keyString ), '' );
		categoryString = categoryString.replace( / /g, '_' );
		return categoryString.replace( /"/g, '' );
	}

	function addAjaxThrobber() {
		$( '#searchButton, #mw-searchButton' ).addClass( 'deep-cat-throbber-small' );
		$( '#searchText' ).addClass( 'deep-cat-throbber-big' );
	}

	function removeAjaxThrobber() {
		$( '#searchButton, #mw-searchButton' ).removeClass( 'deep-cat-throbber-small' );
		$( '#searchText' ).removeClass( 'deep-cat-throbber-big' );
	}

	function log( stuff ) {
		if ( console && console.log ) {
			console.log( stuff );
		}
	}

	String.format = function () {
		var s = arguments[0];
		for ( var i = 0; i < arguments.length - 1; i++ ) {
			var reg = new RegExp( "\\{" + i + "\\}", "gm" );
			s = s.replace( reg, arguments[i + 1] );
		}

		return s;
	};

	function getUrlParameter( sParam ) {
		var sPageURL = window.location.search.substring( 1 );
		var sURLVariables = sPageURL.split( '&' );
		for ( var i = 0; i < sURLVariables.length; i++ ) {
			var sParameterName = sURLVariables[i].split( '=' );
			if ( sParameterName[0] == sParam ) {
				return decodeURIComponent( sParameterName[1] );
			}
		}
	}
}());
