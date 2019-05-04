/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/*
 *   Quality of this code: sketch
 */

#pragma once

#include "Conduits/Pubc/Base Nexus.h"

#include "IrisBase/Pubc/Interface Layouts.h"
#include "IrisBase/Pubc/Connexion Enumerator.h"
#include "IrisBase/Pubc/Iris Objectman.h"

namespace IrisBack {
namespace Base {

	class Layouts : public IrisBack::Core::ILayouts {
        CON_RMR_DECLARE_CLASS(Layouts, IrisBack::Core::ILayouts);

        using UUID = Objects::Objectman::UUID;

    protected:
        struct __LayoutProps {
			Path	Setup_Dir;
        } Layout_Props;

        std::thread              Conduit_Handler;
        Conduits::NexusHolder<>  Message_Nexus;
        
        std::vector<Conduits::Raw::ConduitRef>  Active_Conduits;

        Objects::Objectman       Objectman;
        std::vector<UUID>        DirtyObjects;

		Connexion::ConnexionEnumerator	Connextion_Enum;

        void internal_conduit_handler();
        void internal_handle_conduit_layout_message(Conduits::Raw::ConduitRef, Conduits::Raw::IMessage*);

        void internal_ensure_objectman_elements();
        
        void internal_create_object_from_command(const JSON);
        void internal_update_object_from_command(const JSON);
        void internal_replace_children_from_command(const JSON);

        const Objects::Object * internal_get_from_JSON_string_or_throw(const JSON);
	public:
        ~Layouts() override { ; }
        
        void initialise(const JSON) override;
        void deinitialise(const JSON) override;

        void commence() override;
        void end_and_wait() override;

		void update_connexion_enumeration();
		
        bool async_relay_message(Conduits::Raw::IMessage*) noexcept;

        virtual void set_setup_dir(const Path);
        virtual Path get_setup_dir();

		JSON get_connexion_enumeration() const override;
        
        CON_RMR_DECLARE_FUNC(ping);
        CON_RMR_DECLARE_FUNC(conduit_connect_layouts);
        CON_RMR_DECLARE_FUNC(get_uuid_for_name);
        CON_RMR_DECLARE_FUNC(get_state_for_uuids);
        CON_RMR_DECLARE_FUNC(update_state_for_uuid);
	};

}
}