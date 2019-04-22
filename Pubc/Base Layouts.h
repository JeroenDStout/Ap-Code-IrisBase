/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/*
 *   Quality of this code: sketch
 */

#pragma once

#include "IrisBase/Pubc/Interface Layouts.h"
#include "IrisBase/Pubc/Connexion Enumerator.h"

namespace IrisBack {
namespace Base {

	class Layouts : public IrisBack::Core::ILayouts {
        CON_RMR_DECLARE_CLASS(Layouts, IrisBack::Core::ILayouts);

    protected:
        struct __LayoutProps {
			Path	Setup_Dir;
        } Layout_Props;

		Connexion::ConnexionEnumerator	Connextion_Enum;

	public:
        ~Layouts() override { ; }
        
        void initialise(const JSON) override;
        void deinitialise(const JSON) override;

		void update_connexion_enumeration();
		
        virtual void set_setup_dir(const Path);
        virtual Path get_setup_dir();

		JSON get_connexion_enumeration() const override;
	};

}
}