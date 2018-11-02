frappe.provide("frappe.ui");
frappe.ui.shortcut = class Shortcut {

	constructor() {
		this.user_homepage = frappe.session.user_homepage;
		this.nav = frappe.session.user_nav;

		this.update_reroute();

		this.container = $("#shortcut_div");
		$("#shortcut_div").hide();

		this.update_dom();
		this.render();
		this.register_icon_events();
		this.make_sortable();
		this.setup_wiggle();
	}

	get_user_shortcut_settings(){
		frappe.call({
			method: "frappe.utils.user.get_user_shortcut_settings",
			args: {"user": frappe.session.user}
		}).done((r) => {
			if(r.message){
				this.nav = r.message.nav;
				this.user_homepage = r.message.user_homepage;
				frappe.session.user_nav = r.message.nav;
				frappe.session.user_homepage = r.message.user_homepage;
				this.update_reroute();
				this.update_dom();
			}
		}).fail((f) => {
			console.log(f);
		});
	}

	update_reroute(){
		if(frappe.re_route["#desktop"]) delete frappe.re_route["#desktop"];
		if(frappe.re_route[""]) delete frappe.re_route[""];

		if(frappe.session.user_homepage && frappe.session.user_homepage != "" && frappe.session.user_homepage != "desktop"){
			frappe.re_route[""] = frappe.session.user_homepage;
			if(frappe.session.user_nav == "Sidebar"){
				frappe.re_route["#desktop"] = frappe.session.user_homepage;
			}
		}
	}

	update_dom(){
		if(this.nav == "Sidebar"){
			$("#body_div").addClass("shortcut-body");
			this.container.show();
		} else {
			$("#body_div").removeClass("shortcut-body");
			this.container.hide();
		}
	}

	render() {
		var all_icons = frappe.get_desktop_icons();
		let all_html = "";
		for(var idx in all_icons) {
			let icon = all_icons[idx];
			let html = this.get_shortcut_html(icon.module_name, icon.link, icon.label, icon.app_icon, icon._id, icon._doctype);
			all_html += html;
		}
		this.container.html(all_html);
		this.handle_route_change();
		var me = this;
		frappe.route.on("change", function(){
			me.handle_route_change();
		});
	}

	register_icon_events() {
		this.wiggling = false;
		var me = this;
		this.container.on("click", ".app-icon, .app-icon-svg", function() {
			if ( !me.wiggling ) {
				me.go_to_route($(this).parent());
			}
		});
		$("#shortcut_div .shortcut-icon").each(function() {
			$(this).find(".app-icon").tooltip({
				container: ".main-section",
				placement: "right"
			});
		});
	}

	get_shortcut_html(module_name, link, label, app_icon, id, doctype) {
		return `
		<div class="shortcut-icon"
			data-name="${ module_name }" data-link="${ link }" title="${ label }">
			${ app_icon }
			<div class="case-label ellipsis">
				<div class="circle notis module-count-${ id }" data-doctype="${ doctype }" style="display: none;">
					<span class="circle-text"></span>
				</div>
			</div>
			<div class="circle module-remove" style="background-color:#E0E0E0; color:#212121; display: none;">
				<div class="circle-text">
					<b>
						&times
					</b>
				</div>
			</div>
		</div>
		`;
	}

	make_sortable() {
		new Sortable($("#shortcut_div").get(0), {
			animation: 150,
			onUpdate: function() {
				var new_order = [];
				$("#shortcut_div .shortcut-icon").each(function() {
					new_order.push($(this).attr("data-name"));
				});

				frappe.call({
					method: 'frappe.desk.doctype.desktop_icon.desktop_icon.set_order',
					args: {
						'new_order': new_order,
						'user': frappe.session.user
					},
					quiet: true
				});
			}
		});
	}

	handle_route_change() {
		// Inactivate links
		$( "#shortcut_div .shortcut-icon" ).each(function() {

			let route = frappe.get_route().join('/');
			let data_link = $(this).attr("data-link");

			if(route.includes(data_link)){
				$(this).removeClass("inactive-shortcut");
			} else if(!$(this).hasClass("inactive-shortcut")) {
				$(this).addClass("inactive-shortcut");
			}

		});
	}

	go_to_route(parent) {
		var link = parent.attr("data-link");
		if(link) {
			frappe.set_route(link);
		}
		return false;
	}

	setup_wiggle() {
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1000;

		var   timer_id      = 0;
		const $cases        = this.container.find('.shortcut-icon');
		const $icons        = this.container.find('.app-icon');
		const $notis        = $(this.container.find('.notis').toArray().filter((object) => {
			// This hack is so bad, I should punch myself.
			// Seriously, punch yourself.
			const text      = $(object).find('.circle-text').html();

			return text;
		}));
		const $closes   = $cases.find('.module-remove');

		const clearWiggle   = () => {

			$closes.hide();
			$notis.show();

			$icons.removeClass('wiggle');

			this.wiggling   = false;
		};

		var me = this;

		$cases.each((i) => {
			const $case    = $($cases[i]);

			const $close  = $case.find('.module-remove');
			const name    = $case.attr('title');
			$close.click(() => {
				// good enough to create dynamic dialogs?
				const dialog = new frappe.ui.Dialog({
					title: __(`Hide ${name}?`)
				});
				dialog.set_primary_action(__('Hide'), () => {
					frappe.call({
						method: 'frappe.desk.doctype.desktop_icon.desktop_icon.hide',
						args: { name: name },
						freeze: true,
						callback: (response) =>
						{
							if ( response.message ) {
								location.reload();
							}
						}
					})

					dialog.hide();

					clearWiggle();
				});
				// Hacks, Hacks and Hacks.
				var $cancel = dialog.get_close_btn();
				$cancel.click(() => {
					clearWiggle();
				});
				$cancel.html(__(`Cancel`));

				dialog.show();
			});
		});

		this.container.on('mousedown', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				me.wiggling = true;
				// hide all notifications.
				$notis.hide();
				$closes.show();

				$icons.addClass('wiggle');

			}, DURATION_LONG_PRESS);
		});
		this.container.on('mouseup mouseleave', '.app-icon', () => {
			clearTimeout(timer_id);
		});

		// also stop wiggling if clicked elsewhere.
		$('body').click((event) => {
			if ( me.wiggling ) {
				const $target = $(event.target);
				// our target shouldn't be .app-icons or .close
				const $parent = $target.parents('.shortcut-icon');
				if ( $parent.length == 0 )
					clearWiggle();
			}
		});
		// end wiggle
	}
};

$(document).on('app_ready',function() {
	frappe.shortcut_bar = new frappe.ui.shortcut();
});
