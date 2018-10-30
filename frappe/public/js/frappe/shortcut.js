frappe.provide("frappe.ui");
frappe.ui.shortcut = class Shortcut {

	constructor() {
		this.container = $("#shortcut_div");
		$("#shortcut_div").hide();
		$("#page-desktop").hide();

		this.cur_route = window.location.hash;
		this.last_route = null;

		this.register_redirect_events();
		this.get_user_shortcut_settings();
		this.render();
		this.register_icon_events();
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
				self.handle_redirect();

				if(self.nav == "Sidebar"){
					$("#body_div").addClass("shortcut-body");
					self.container.show();
				} else {
					$("#body_div").removeClass("shortcut-body");
					self.container.hide();
				}
			}
		}).fail((f) => {
			console.log(f);
		});
	}

	register_redirect_events() {
		var self = this;
		frappe.route.on("change", function(){
			self.last_route = self.cur_route;
			self.cur_route = window.location.hash;
			self.handle_redirect();
		});
	}

	handle_redirect() {
		$("#page-desktop").hide();
		if(this.cur_route == "" && this.last_route == "#"+this.user_homepage) {
			history.back();
		}
		else if(this.nav == "Sidebar" && frappe.get_route()[0] == "" && this.user_homepage != "desktop"){ // if route == desk
			frappe.set_route(this.user_homepage); // redirect to user homepage
		} else if(frappe.get_route()[0] == "") {
			$("#page-desktop").show();
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
		var self = this;
		frappe.route.on("change", function(){
			self.handle_route_change();
		});
	}

	register_icon_events() {
		var self = this;
		this.container.on("click", ".app-icon, .app-icon-svg", function() {
			self.go_to_route($(this).parent());
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
