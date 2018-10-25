frappe.provide("frappe.ui");
frappe.ui.shortcut = class Shortcut {

	constructor() {
		this.container = $("#shortcut_div");
		this.get_user_shortcut_settings();
		this.render();
		this.setup_click();
		$("#shortcut_div .shortcut-icon").each(function() {
			$(this).find(".app-icon").tooltip({
				container: ".main-section",
				placement: "right"
			});
		});
		this.make_sortable();
	}

	get_user_shortcut_settings(){
		var self = this;
		frappe.call({
			method: "frappe.utils.user.get_user_homepage",
			args: {"user": frappe.session.user}
		}).done((r) => {
			if(r.message){
				self.nav = r.message.nav;
				self.user_homepage = r.message.user_homepage;
				// self.container.addClass("shortcut-body");
				if(r.message.nav == "Sidebar"){
					self.register_events();
					$("#body_div").addClass("shortcut-body");
					self.container.removeClass("hidden");
				} else {
					self.container.addClass("hidden");
					$("#body_div").removeClass("shortcut-body");
				}
			}
		}).fail((f) => {
			console.log(f);
		});
	}

	register_events() {
		var self = this;
		$(document).ready(function() {
			if(frappe.get_route()[0] == ""){ // if route == desk
				$("#page-desktop").hide();
				self.redirect_to_user_homepage();
			}
		});

		frappe.route.on("change", function(){
			if(frappe.get_route()[0] == ""){ // if route == desk
				$("#page-desktop").hide();
				self.redirect_to_user_homepage();
			}
		});
	}

	redirect_to_user_homepage(){
		frappe.set_route(this.user_homepage);
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
		var self = this;
		frappe.route.on("change", function(){
			self.handle_route_change();
		});
	}

	setup_click() {
		var self = this;
		this.container.on("click", ".app-icon, .app-icon-svg", function() {
			self.go_to_route($(this).parent());
		});
	}

	get_shortcut_html(module_name, link, label, app_icon, id, doctype) {
		return `
		<div class="shortcut-icon"
			data-name="${ module_name }" data-link="${ link }" title="${ label }">
			${ app_icon }
			<div class="case-label ellipsis">
				<div class="circle module-count-${ id }" data-doctype="${ doctype }" style="display: none;">
					<span class="circle-text"></span>
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
		// Adjust height
		if(frappe.get_route().length == 1 && frappe.get_route()[0] == "") {
			$("#shortcut_div").addClass("desk_shortcut_div");
		} else {
			$("#shortcut_div").removeClass("desk_shortcut_div");
		}
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
};

$(document).on('app_ready',function() {
	frappe.shortcut_bar = new frappe.ui.shortcut();
});
